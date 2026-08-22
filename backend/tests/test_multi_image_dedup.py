import sys
import time
import json
import httpx
from pathlib import Path

def test_dedup():
    print("Testing multi-image deduplication...")
    client = httpx.Client(base_url="http://127.0.0.1:8000", timeout=120)
    
    test_img = Path(__file__).resolve().parent.parent / "data" / "test" / "test_room.jpg"
    if not test_img.exists():
        print(f"Error: {test_img} not found.")
        sys.exit(1)

    print("Uploading test_room.jpg twice...")
    with open(test_img, "rb") as f1, open(test_img, "rb") as f2:
        files = [
            ("images", ("test_room_1.jpg", f1, "image/jpeg")),
            ("images", ("test_room_2.jpg", f2, "image/jpeg"))
        ]
        data = {
            "width_m": 4.0,
            "length_m": 5.0,
            "height_m": 2.8,
            "pipeline_mode": "real"
        }
        r = client.post("/api/v1/rooms/generate", data=data, files=files)
        
        if r.status_code != 202:
            print("Failed to start job:", r.text)
            sys.exit(1)

        job_id = r.json()["job_id"]
        print(f"Job ID: {job_id}")

        manifest_received = None

        with client.stream("GET", f"/api/v1/rooms/{job_id}/stream") as response:
            for line in response.iter_lines():
                if line:
                    print("->", line[:100])
                    if line.startswith("data: {") and "furniture" in line:
                        manifest_received = json.loads(line[6:])

        if not manifest_received:
            man_res = client.get(f"/api/v1/rooms/{job_id}/manifest")
            if man_res.status_code == 200:
                manifest_received = man_res.json()

        det_res = client.get(f"/api/v1/rooms/{job_id}/detections")
        print("\nHTTP GET /detections ->", det_res.status_code)
        det_data = det_res.json()
        
        detected_count = det_data["detected_count"]
        print(f"Verified detected count: {detected_count}")
        
        for item in det_data["detections"]:
            print(f" * {item['label'].upper()} (conf: {item['confidence']:.2f})")
            
        # Since we upload the same image twice, we expect it to detect the same objects twice, 
        # but deduplication should reduce it back to the unique count (2).
        if detected_count != 2:
            print(f"Error: Expected exactly 2 unique detected items after dedup, got {detected_count}.")
            sys.exit(1)
            
        print("\nAll pipeline assertions PASSED!")

if __name__ == "__main__":
    test_dedup()
