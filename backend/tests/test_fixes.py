from pathlib import Path
import httpx
import json
import sys

def main():
    test_img = Path(__file__).resolve().parent.parent / "data" / "test" / "test_room.jpg"
    with open(test_img, "rb") as f:
        files = {"images": ("test_room.jpg", f.read(), "image/jpeg")}
    data = {"width_m": 4.0, "length_m": 5.0, "height_m": 2.7}

    with httpx.Client(base_url="http://localhost:8000", timeout=90.0) as client:
        print("Submitting job to updated AI vision & layout pipeline...")
        r = client.post("/api/v1/rooms/generate", data=data, files=files)
        assert r.status_code == 202, f"Expected 202, got {r.status_code}: {r.text}"
        job_id = r.json()["job_id"]
        print(f"Job ID: {job_id}")

        manifest_received = None
        review_received = None

        with client.stream("GET", f"/api/v1/rooms/{job_id}/stream") as response:
            for line in response.iter_lines():
                if line:
                    print("->", line[:100])
        if not manifest_received:
            man_res = client.get(f"/api/v1/rooms/{job_id}/manifest")
            if man_res.status_code == 200:
                manifest_received = man_res.json()
        det_res = client.get(f"/api/v1/rooms/{job_id}/detections")
        print("HTTP GET /detections ->", det_res.status_code)
        det_data = det_res.json()
        print("Verified detected count:", det_data.get("detected_count"))
        for d in det_data.get("detections", []):
            lbl = d["label"].upper()
            conf = d["confidence"]
            bbox = [round(v, 3) for v in d["bbox_normalized"]]
            est = d["dimensions_estimated"]
            preview = d["preview_url"]
            print(f" * {lbl} (conf: {conf:.2f}, bbox: {bbox}, est_dims: {est})")
            
            # Verify thumbnail cutout URL
            p_res = client.get(preview)
            print(f"   Preview {preview} -> HTTP {p_res.status_code} ({len(p_res.content)} bytes)")

        print("\n--- 2. Testing Final Scene Manifest & Floor Layout ---")
        if manifest_received:
            furniture_list = manifest_received.get("furniture", [])
            print(f"Final Placed Furniture Count: {len(furniture_list)}")
            for item in furniture_list:
                lbl = item["label"].upper()
                pos = [round(v, 3) for v in item["position"]]
                dims = [round(v, 3) for v in item["dimensions"]]
                rot = round(item["rotation_y"], 3)
                glb_url = item["glb_url"]
                print(f" * {lbl}: pos={pos}, dims={dims}, rot_y={rot}")
                
                # Verify GLB accessibility
                glb_res = client.get(glb_url)
                assert glb_res.status_code == 200, f"GLB fetch failed: {glb_url}"
                print(f"   GLB URL: {glb_url} -> HTTP 200 ({len(glb_res.content)} bytes)")
            print("\nAll pipeline assertions PASSED!")
        else:
            print("Error: Manifest was not delivered!")
            sys.exit(1)

if __name__ == "__main__":
    main()
