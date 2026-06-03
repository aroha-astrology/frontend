// Minimal city data for place search and onboarding.
// Extend this list or replace with an API-backed solution as needed.

export interface CityData {
  name: string;
  state: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export const INDIAN_CITIES: CityData[] = [
  { name: 'Mumbai', state: 'Maharashtra', latitude: 19.076, longitude: 72.8777, timezone: 'Asia/Kolkata' },
  { name: 'Delhi', state: 'Delhi', latitude: 28.7041, longitude: 77.1025, timezone: 'Asia/Kolkata' },
  { name: 'Bengaluru', state: 'Karnataka', latitude: 12.9716, longitude: 77.5946, timezone: 'Asia/Kolkata' },
  { name: 'Hyderabad', state: 'Telangana', latitude: 17.385, longitude: 78.4867, timezone: 'Asia/Kolkata' },
  { name: 'Chennai', state: 'Tamil Nadu', latitude: 13.0827, longitude: 80.2707, timezone: 'Asia/Kolkata' },
  { name: 'Kolkata', state: 'West Bengal', latitude: 22.5726, longitude: 88.3639, timezone: 'Asia/Kolkata' },
  { name: 'Pune', state: 'Maharashtra', latitude: 18.5204, longitude: 73.8567, timezone: 'Asia/Kolkata' },
  { name: 'Ahmedabad', state: 'Gujarat', latitude: 23.0225, longitude: 72.5714, timezone: 'Asia/Kolkata' },
  { name: 'Jaipur', state: 'Rajasthan', latitude: 26.9124, longitude: 75.7873, timezone: 'Asia/Kolkata' },
  { name: 'Surat', state: 'Gujarat', latitude: 21.1702, longitude: 72.8311, timezone: 'Asia/Kolkata' },
  { name: 'Lucknow', state: 'Uttar Pradesh', latitude: 26.8467, longitude: 80.9462, timezone: 'Asia/Kolkata' },
  { name: 'Kanpur', state: 'Uttar Pradesh', latitude: 26.4499, longitude: 80.3319, timezone: 'Asia/Kolkata' },
  { name: 'Nagpur', state: 'Maharashtra', latitude: 21.1458, longitude: 79.0882, timezone: 'Asia/Kolkata' },
  { name: 'Indore', state: 'Madhya Pradesh', latitude: 22.7196, longitude: 75.8577, timezone: 'Asia/Kolkata' },
  { name: 'Thane', state: 'Maharashtra', latitude: 19.2183, longitude: 72.9781, timezone: 'Asia/Kolkata' },
  { name: 'Bhopal', state: 'Madhya Pradesh', latitude: 23.2599, longitude: 77.4126, timezone: 'Asia/Kolkata' },
  { name: 'Visakhapatnam', state: 'Andhra Pradesh', latitude: 17.6868, longitude: 83.2185, timezone: 'Asia/Kolkata' },
  { name: 'Patna', state: 'Bihar', latitude: 25.5941, longitude: 85.1376, timezone: 'Asia/Kolkata' },
  { name: 'Vadodara', state: 'Gujarat', latitude: 22.3072, longitude: 73.1812, timezone: 'Asia/Kolkata' },
  { name: 'Ghaziabad', state: 'Uttar Pradesh', latitude: 28.6692, longitude: 77.4538, timezone: 'Asia/Kolkata' },
  { name: 'Ludhiana', state: 'Punjab', latitude: 30.901, longitude: 75.8573, timezone: 'Asia/Kolkata' },
  { name: 'Agra', state: 'Uttar Pradesh', latitude: 27.1767, longitude: 78.0081, timezone: 'Asia/Kolkata' },
  { name: 'Nashik', state: 'Maharashtra', latitude: 19.9975, longitude: 73.7898, timezone: 'Asia/Kolkata' },
  { name: 'Faridabad', state: 'Haryana', latitude: 28.4089, longitude: 77.3178, timezone: 'Asia/Kolkata' },
  { name: 'Meerut', state: 'Uttar Pradesh', latitude: 28.9845, longitude: 77.7064, timezone: 'Asia/Kolkata' },
  { name: 'Rajkot', state: 'Gujarat', latitude: 22.3039, longitude: 70.8022, timezone: 'Asia/Kolkata' },
  { name: 'Varanasi', state: 'Uttar Pradesh', latitude: 25.3176, longitude: 82.9739, timezone: 'Asia/Kolkata' },
  { name: 'Srinagar', state: 'Jammu & Kashmir', latitude: 34.0837, longitude: 74.7973, timezone: 'Asia/Kolkata' },
  { name: 'Aurangabad', state: 'Maharashtra', latitude: 19.8762, longitude: 75.3433, timezone: 'Asia/Kolkata' },
  { name: 'Dhanbad', state: 'Jharkhand', latitude: 23.7957, longitude: 86.4304, timezone: 'Asia/Kolkata' },
  { name: 'Amritsar', state: 'Punjab', latitude: 31.634, longitude: 74.8723, timezone: 'Asia/Kolkata' },
  { name: 'Allahabad', state: 'Uttar Pradesh', latitude: 25.4358, longitude: 81.8463, timezone: 'Asia/Kolkata' },
  { name: 'Prayagraj', state: 'Uttar Pradesh', latitude: 25.4358, longitude: 81.8463, timezone: 'Asia/Kolkata' },
  { name: 'Ranchi', state: 'Jharkhand', latitude: 23.3441, longitude: 85.3096, timezone: 'Asia/Kolkata' },
  { name: 'Coimbatore', state: 'Tamil Nadu', latitude: 11.0168, longitude: 76.9558, timezone: 'Asia/Kolkata' },
  { name: 'Jabalpur', state: 'Madhya Pradesh', latitude: 23.1815, longitude: 79.9864, timezone: 'Asia/Kolkata' },
  { name: 'Gwalior', state: 'Madhya Pradesh', latitude: 26.2183, longitude: 78.1828, timezone: 'Asia/Kolkata' },
  { name: 'Vijayawada', state: 'Andhra Pradesh', latitude: 16.5062, longitude: 80.648, timezone: 'Asia/Kolkata' },
  { name: 'Jodhpur', state: 'Rajasthan', latitude: 26.2389, longitude: 73.0243, timezone: 'Asia/Kolkata' },
  { name: 'Madurai', state: 'Tamil Nadu', latitude: 9.9252, longitude: 78.1198, timezone: 'Asia/Kolkata' },
  { name: 'Raipur', state: 'Chhattisgarh', latitude: 21.2514, longitude: 81.6296, timezone: 'Asia/Kolkata' },
  { name: 'Kota', state: 'Rajasthan', latitude: 25.2138, longitude: 75.8648, timezone: 'Asia/Kolkata' },
  { name: 'Chandigarh', state: 'Chandigarh', latitude: 30.7333, longitude: 76.7794, timezone: 'Asia/Kolkata' },
  { name: 'Guwahati', state: 'Assam', latitude: 26.1445, longitude: 91.7362, timezone: 'Asia/Kolkata' },
  { name: 'Thiruvananthapuram', state: 'Kerala', latitude: 8.5241, longitude: 76.9366, timezone: 'Asia/Kolkata' },
  { name: 'Kochi', state: 'Kerala', latitude: 9.9312, longitude: 76.2673, timezone: 'Asia/Kolkata' },
  { name: 'Bhubaneswar', state: 'Odisha', latitude: 20.2961, longitude: 85.8245, timezone: 'Asia/Kolkata' },
  { name: 'Dehradun', state: 'Uttarakhand', latitude: 30.3165, longitude: 78.0322, timezone: 'Asia/Kolkata' },
  { name: 'Mysuru', state: 'Karnataka', latitude: 12.2958, longitude: 76.6394, timezone: 'Asia/Kolkata' },
  { name: 'Tiruchirappalli', state: 'Tamil Nadu', latitude: 10.7905, longitude: 78.7047, timezone: 'Asia/Kolkata' },
];
