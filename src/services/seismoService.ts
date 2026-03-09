import { SeismicEvent } from "./aiService";

export const fetchUSGSEvents = async (startTime: string, endTime: string): Promise<SeismicEvent[]> => {
  const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${startTime}&endtime=${endTime}&minmagnitude=2.5`;
  const response = await fetch(url);
  const data = await response.json();
  
  return data.features.map((f: any) => ({
    id: f.id,
    time: new Date(f.properties.time).toISOString(),
    latitude: f.geometry.coordinates[1],
    longitude: f.geometry.coordinates[0],
    depth: f.geometry.coordinates[2],
    magnitude: f.properties.mag,
    place: f.properties.place,
  }));
};

export const fetchStationData = async (net: string, sta: string): Promise<any> => {
  // Mocking station inventory fetch
  return {
    network: net,
    station: sta,
    latitude: 34.0522,
    longitude: -118.2437,
    elevation: 100,
  };
};
