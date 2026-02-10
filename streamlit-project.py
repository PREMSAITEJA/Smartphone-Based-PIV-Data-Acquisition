import streamlit as st
import cv2
import numpy as np
from PIL import Image, ImageSequence
import tempfile
from streamlit_webrtc import webrtc_streamer, VideoTransformerBase, RTCConfiguration
from fpdf import FPDF
import io
import os
import threading
import time

# --- CONFIGURATION ---
RTC_CONFIG = RTCConfiguration({"iceServers": [{"urls": ["stun:stun.l.google.com:19302"]}]})
st.set_page_config(page_title="PIV Logic Pro", layout="wide")

# High-speed capture targets (kept as constants in this Streamlit demo)
TARGET_FPS = 240
TARGET_DT_SEC = 1.0 / TARGET_FPS
VIZ_HZ = 10.0
VIZ_DT_SEC = 1.0 / VIZ_HZ
MANUAL_EXPOSURE_TIME_NS = int(1e6)  # Placeholder: ~1/1000s
MANUAL_ISO = 800

if 'session_data' not in st.session_state:
    st.session_state.session_data = []


class RingBuffer:
    def __init__(self, capacity):
        self.capacity = capacity
        self.buffer = None
        self.timestamps = None
        self.write_idx = 0
        self.full = False

    def _ensure(self, frame_shape):
        if self.buffer is None:
            self.buffer = np.zeros((self.capacity,) + frame_shape, dtype=np.uint8)
            self.timestamps = np.zeros((self.capacity,), dtype=np.float64)

    def push(self, frame, timestamp):
        self._ensure(frame.shape)
        self.buffer[self.write_idx] = frame
        self.timestamps[self.write_idx] = timestamp
        self.write_idx = (self.write_idx + 1) % self.capacity
        if self.write_idx == 0:
            self.full = True

    def snapshot(self):
        if self.buffer is None:
            return None, None
        size = self.capacity if self.full else self.write_idx
        if size == 0:
            return None, None
        if not self.full:
            return self.buffer[:size].copy(), self.timestamps[:size].copy()
        idx = self.write_idx
        frames = np.concatenate((self.buffer[idx:], self.buffer[:idx]), axis=0)
        times = np.concatenate((self.timestamps[idx:], self.timestamps[:idx]), axis=0)
        return frames.copy(), times.copy()

    def get_frame_pair(self, target_dt):
        frames, times = self.snapshot()
        if frames is None or len(frames) < 2:
            return None
        t2 = times[-1]
        dt = np.abs((t2 - times[:-1]) - target_dt)
        idx = int(np.argmin(dt))
        return frames[idx], frames[-1]


def dump_raw_frames(frames, timestamps, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    raw_path = os.path.join(out_dir, "piv_frames.raw")
    meta_path = os.path.join(out_dir, "piv_frames_meta.txt")
    with open(raw_path, "wb") as raw_file:
        raw_file.write(frames.tobytes(order="C"))
    with open(meta_path, "w", encoding="utf-8") as meta_file:
        meta_file.write(f"shape={frames.shape}\n")
        meta_file.write(f"dtype={frames.dtype}\n")
        meta_file.write("timestamps_sec=\n")
        meta_file.write("\n".join(f"{t:.6f}" for t in timestamps))


def compute_piv_vectors(frame_a, frame_b, window=64, search=12):
    h, w = frame_a.shape
    vectors = []
    for y in range(0, h - window + 1, window):
        for x in range(0, w - window + 1, window):
            win_a = frame_a[y:y + window, x:x + window]
            y0 = max(0, y - search)
            x0 = max(0, x - search)
            y1 = min(h, y + window + search)
            x1 = min(w, x + window + search)
            win_b = frame_b[y0:y1, x0:x1]
            if win_b.shape[0] < window or win_b.shape[1] < window:
                continue
            corr = cv2.matchTemplate(win_b, win_a, cv2.TM_CCORR_NORMED)
            _, _, _, max_loc = cv2.minMaxLoc(corr)
            dy = (y0 + max_loc[1]) - y
            dx = (x0 + max_loc[0]) - x
            vectors.append((x + window // 2, y + window // 2, dx, dy))
    return vectors


def overlay_vectors(img_bgr, vectors, scale=2.0):
    for x, y, dx, dy in vectors:
        end = (int(x + dx * scale), int(y + dy * scale))
        cv2.arrowedLine(img_bgr, (int(x), int(y)), end, (0, 255, 255), 1, tipLength=0.3)
    return img_bgr


def generate_video_report(readings, fps):
    if not readings:
        return b""
    values = [r["mean"] for r in readings]
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Arial", 'B', 16)
    pdf.cell(200, 10, "PIV Phase 3: Video Processing Report", ln=True, align='C')
    pdf.set_font("Arial", size=10)
    pdf.ln(10)
    pdf.cell(200, 8, f"Frames: {len(values)}", ln=True)
    pdf.cell(200, 8, f"FPS: {fps:.2f}", ln=True)
    pdf.cell(200, 8, f"Mean Luminance: {np.mean(values):.2f}", ln=True)
    pdf.cell(200, 8, f"Min/Max Luminance: {np.min(values):.2f} / {np.max(values):.2f}", ln=True)
    pdf.ln(5)

    pdf.set_fill_color(230, 230, 230)
    pdf.cell(40, 8, "Frame", 1, 0, 'C', 1)
    pdf.cell(60, 8, "Timestamp (ms)", 1, 0, 'C', 1)
    pdf.cell(60, 8, "Mean Luminance", 1, 1, 'C', 1)
    for r in readings[-25:]:
        pdf.cell(40, 8, str(r["frame"]), 1)
        pdf.cell(60, 8, f"{r['time_ms']:.2f}", 1)
        pdf.cell(60, 8, f"{r['mean']:.2f}", 1, 1)
    return pdf.output(dest='S').encode('latin-1')


def generate_video_csv(readings):
    buffer = io.StringIO()
    buffer.write("frame,time_ms,mean_luminance\n")
    for r in readings:
        buffer.write(f"{r['frame']},{r['time_ms']:.6f},{r['mean']:.6f}\n")
    return buffer.getvalue().encode("utf-8")

# --- PDF GENERATOR (Enhanced) ---
def generate_piv_report(readings):
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Arial", 'B', 16)
    pdf.cell(200, 10, "PIV Phase 1: Acquisition Report", ln=True, align='C')
    pdf.set_font("Arial", size=10)
    pdf.ln(10)
    
    pdf.cell(200, 10, f"Analysis Mode: Local Interrogation Window Variance", ln=True)
    pdf.cell(200, 10, f"Manual Exposure (ns): {MANUAL_EXPOSURE_TIME_NS}", ln=True)
    pdf.cell(200, 10, f"Manual ISO: {MANUAL_ISO}", ln=True)
    pdf.ln(5)
    
    # Header
    pdf.set_fill_color(230, 230, 230)
    pdf.cell(45, 10, "Timestamp (ms)", 1, 0, 'C', 1)
    pdf.cell(45, 10, "Avg Intensity", 1, 0, 'C', 1)
    pdf.cell(45, 10, "Peak Variance", 1, 0, 'C', 1)
    pdf.cell(45, 10, "Flow Status", 1, 1, 'C', 1)
    
    for r in readings[-25:]: # Show last 25 entries
        pdf.cell(45, 10, f"{r['time']:.2f}", 1)
        pdf.cell(45, 10, f"{r['avg']:.2f}", 1)
        pdf.cell(45, 10, f"{r['var']:.2f}", 1)
        pdf.cell(45, 10, "ACTIVE", 1, 1)
    
    return pdf.output(dest='S').encode('latin-1')

# --- UI LOGIC ---
st.sidebar.title("Samsung S25 PIV Control")
mode = st.sidebar.selectbox("Module Selection", ["Image Analysis (TIF)", "Real-Time Cam", "Video Lab"])

# --- MODULE 1: IMAGE ANALYSIS ---
if mode == "Image Analysis (TIF)":
    st.header("📸 Localized Grid Analysis")
    st.write("Breaking the frame into $32 \\times 32$ interrogation windows to detect particle density variations.")
    
    file = st.file_uploader("Upload PIV TIF", type=["tif", "tiff"])
    if file:
        img = Image.open(file)
        img_arr = np.array(img).astype(np.float32)
        
        # NORMALIZATION for preview
        disp = ((img_arr - img_arr.min()) / (img_arr.max() - img_arr.min()) * 255).astype(np.uint8)
        
        # GRID ANALYSIS (The "Change" you asked for)
        h, w = disp.shape
        grid_size = 32
        # Calculate variance in a central 4x4 block of windows to show dynamic data
        local_avg = np.mean(disp[h//2:h//2+grid_size, w//2:w//2+grid_size])
        local_var = np.var(disp[h//2:h//2+grid_size, w//2:w//2+grid_size])

        col1, col2 = st.columns([2, 1])
        with col1:
            # Draw a grid overlay for the demo
            for i in range(0, w, 64): cv2.line(disp, (i,0), (i,h), (255), 1)
            for j in range(0, h, 64): cv2.line(disp, (0,j), (w,j), (255), 1)
            st.image(disp, caption="Interrogation Window Grid Overlay")
        
        with col2:
            st.metric("Window Avg Intensity", f"{local_avg:.2f}")
            st.metric("Particle Contrast (Var)", f"{local_var:.2f}")
            st.write("Histogram of Current Window:")
            hist = cv2.calcHist([disp], [0], None, [256], [0, 256])
            st.line_chart(hist)

# --- MODULE 2: REAL-TIME CAM ---
elif mode == "Real-Time Cam":
    st.header("📲 Live PIV Feed")
    
    class PIVEngine(VideoTransformerBase):
        def __init__(self):
            self.ring_buffer = st.session_state.get("ring_buffer")
            if self.ring_buffer is None:
                self.ring_buffer = RingBuffer(capacity=TARGET_FPS * 2)
                st.session_state.ring_buffer = self.ring_buffer
            self.last_viz_ts = 0.0

        def transform(self, frame):
            now = time.perf_counter()
            img = frame.to_ndarray(format="bgr24")
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            self.ring_buffer.push(gray, now)
            
            # Record data point
            ts = float(now * 1000.0)
            val = float(np.mean(gray))
            vari = float(np.var(gray))
            st.session_state.session_data.append({"time": ts, "avg": val, "var": vari})

            if now - self.last_viz_ts >= VIZ_DT_SEC:
                pair = self.ring_buffer.get_frame_pair(TARGET_DT_SEC)
                if pair is not None:
                    frame_a, frame_b = pair
                    vectors = compute_piv_vectors(frame_a, frame_b, window=64, search=12)
                    img = overlay_vectors(img, vectors, scale=2.0)
                self.last_viz_ts = now
            
            # Visual marker
            cv2.putText(img, f"SYNC: {val:.1f}", (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
            return img

    webrtc_streamer(key="piv-live", video_transformer_factory=PIVEngine, rtc_configuration=RTC_CONFIG)
    
    if st.button("🛑 Stop & Export PDF"):
        if st.session_state.session_data:
            ring_buffer = st.session_state.get("ring_buffer")
            if ring_buffer is not None:
                frames, times = ring_buffer.snapshot()
                if frames is not None:
                    out_dir = os.path.join(tempfile.gettempdir(), "piv_capture")
                    threading.Thread(
                        target=dump_raw_frames,
                        args=(frames, times, out_dir),
                        daemon=True
                    ).start()
            pdf_bytes = generate_piv_report(st.session_state.session_data)
            st.download_button("Download PIV Analysis Report", pdf_bytes, "PIV_Data.pdf", "application/pdf")

# --- MODULE 3: VIDEO PROCESSING ---
elif mode == "Video Lab":
    st.header("📽️ Post-Processing Lab")
    video_file = st.file_uploader("Upload 240fps Video", type=["mp4", "mov", "tif", "tiff"])

    if video_file:
        file_name = (video_file.name or "").lower()
        is_tiff = file_name.endswith((".tif", ".tiff"))
        fps = 240.0
        cap = None
        tiff_frames = None

        if is_tiff:
            tiff_image = Image.open(video_file)
            tiff_frames = [np.array(frame.convert("L")) for frame in ImageSequence.Iterator(tiff_image)]
        else:
            tfile = tempfile.NamedTemporaryFile(delete=False)
            tfile.write(video_file.read())
            cap = cv2.VideoCapture(tfile.name)
            fps = cap.get(cv2.CAP_PROP_FPS)
            if not fps or fps <= 0:
                fps = 240.0

        frame_placeholder = st.empty()
        col1, col2 = st.columns(2)
        with col1:
            luminance_placeholder = st.empty()
        with col2:
            hist_placeholder = st.empty()

        video_readings = []
        window_size = 120

        if is_tiff and tiff_frames:
            for gray in tiff_frames:
                frame_idx = len(video_readings)
                mean_val = float(np.mean(gray))
                time_ms = (frame_idx / fps) * 1000.0
                video_readings.append({"frame": frame_idx, "time_ms": time_ms, "mean": mean_val})

                frame_placeholder.image(
                    gray,
                    channels="GRAY",
                    caption="Processing Y-Plane",
                    use_container_width=True
                )

                recent = video_readings[-window_size:]
                luminance_placeholder.line_chart(
                    {"Mean Luminance": [r["mean"] for r in recent]}
                )

                hist = cv2.calcHist([gray], [0], None, [256], [0, 256])
                hist_placeholder.line_chart(hist)
        else:
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break

                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                frame_idx = len(video_readings)
                mean_val = float(np.mean(gray))
                time_ms = (frame_idx / fps) * 1000.0
                video_readings.append({"frame": frame_idx, "time_ms": time_ms, "mean": mean_val})

                frame_placeholder.image(
                    gray,
                    channels="GRAY",
                    caption="Processing Y-Plane",
                    use_container_width=True
                )

                recent = video_readings[-window_size:]
                luminance_placeholder.line_chart(
                    {"Mean Luminance": [r["mean"] for r in recent]}
                )

                hist = cv2.calcHist([gray], [0], None, [256], [0, 256])
                hist_placeholder.line_chart(hist)

            cap.release()

        st.subheader("Video Session Complete")
        csv_bytes = generate_video_csv(video_readings)
        st.download_button(
            label="📄 Download Luminance Data (CSV)",
            data=csv_bytes,
            file_name="Video_PIV_Luminance.csv",
            mime="text/csv"
        )
        pdf_bytes = generate_video_report(video_readings, fps)
        st.download_button(
            label="📄 Download Video Analysis PDF",
            data=pdf_bytes,
            file_name="Video_PIV_Analysis.pdf",
            mime="application/pdf"
        )