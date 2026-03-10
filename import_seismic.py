import sys
import json
import os

try:
    from obspy import read
except ImportError:
    print(json.dumps({"error": "ObsPy not installed. Please run 'pip install obspy'"}))
    sys.exit(1)

def process_file(file_path):
    if not os.path.exists(file_path):
        return {"error": f"File not found: {file_path}"}
    
    try:
        st = read(file_path)
        # Group by station to combine components
        station_groups = {}
        
        for tr in st:
            s_id = f"{tr.stats.network}.{tr.stats.station}"
            if s_id not in station_groups:
                station_groups[s_id] = {
                    "stationId": tr.stats.station,
                    "network": tr.stats.network,
                    "distance": 0, # Placeholder
                    "data": []
                }
            
            data = tr.data.tolist()
            # Decimate for web performance
            if len(data) > 1000:
                step = len(data) // 1000
                data = data[::step]
            
            station_groups[s_id]["data"].append(data)

        return {"success": True, "stations": list(station_groups.values())}
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No file path provided"}))
        sys.exit(1)
    
    file_path = sys.argv[1]
    result = process_file(file_path)
    print(json.dumps(result))
