let latitude = 51.506533;
let longitude = -0.15398;

const mapElement = document.getElementById("map");
let map; // Declare the map variable outside of the functions
let markersLayer; // Declare a variable to store markers layer
let currentPolygon = null; // This will hold the reference to the drawn polygon
let selectedDate;
let currentNeighbourhoodId = null;

const BASE_IMAGE_PATH = "./images/placeholders/";
const DEFAULT_MARKER_IMAGE = BASE_IMAGE_PATH + "generic.png";

// A dictionary to hold each crime category's layer group
const crimeLayers = {};

document.addEventListener("DOMContentLoaded", function () {
  // Wait for the DOM to be ready
  initializeMap();

  const searchButton = document.getElementById("searchButton");
  searchButton.addEventListener("click", handleFormSubmit);

  const postcodeButton = document.getElementById("postcodeButton");
  const postcodeInput = document.getElementById("postcode");

  postcodeButton.addEventListener("click", async function () {
    const postcode = postcodeInput.value.trim();
    if (postcode) {
      const coords = await getPostcodeCoordinates(postcode);
      if (coords) {
        map.setView([coords.latitude, coords.longitude], 15);
        fetchAndDrawBoundaryPostcode(postcode);
        latitude = coords.latitude;
        longitude = coords.longitude;
      }
    }
  });
});

function initializeMap() {
  // Initialize the map at the beginning
  map = L.map("map").setView([latitude, longitude], 15);

  // Initialize a layer group for each crime category
  crimes.forEach((crime) => {
    crimeLayers[crime.url] = L.layerGroup().addTo(map);
  });

  var overlayMaps = {};

  // Construct overlayMaps without "all-crime" and use the crime's name instead of its URL
Object.keys(crimeLayers).forEach((key) => {
  if (key !== "all-crime") {
    const crimeData = crimes.find((c) => c.url === key);
    if (crimeData && crimeData.name) {
      overlayMaps[crimeData.name] = crimeLayers[key]; // use the crime's name
    }
  }
});

  var layerControl = L.control.layers(baseMaps, overlayMaps).addTo(map);

  // Add the OpenStreetMap tile layer
  osm.addTo(map);

  //We draw the area with the default coordinates
  fetchAndDrawBoundaryCoordinates(latitude, longitude);

  // Update the latitude and longitude values with the map's center coordinates
  map.addEventListener("move", () => {
    const mapCenter = map.getCenter();
    latitude = mapCenter.lat.toFixed(6);
    longitude = mapCenter.lng.toFixed(6);
  });

  map.addEventListener("moveend", () => {
    const mapCenter = map.getCenter();
    // Update the latitude and longitude input fields with the map's center coordinates
    latitude = mapCenter.lat.toFixed(6);
    longitude = mapCenter.lng.toFixed(6);
    fetchAndDrawBoundaryCoordinates(latitude, longitude);
    //getCrimes(latitude, longitude, selectedDate);
  });
}

//Get and draw placeholder crimes
function handleFormSubmit() {

  const newLatitude = latitude;
  const newLongitude = longitude;
  selectedDate = document.getElementById("month").value;

  fetchAndDrawBoundaryCoordinates(newLatitude, newLongitude);
  getCrimes(newLatitude, newLongitude, selectedDate);
}

//Get and draw crimes
async function getCrimes(newLatitude, newLongitude, selectedDate) {
  // Start the timer
  console.time("getCrimes Timer");

  // Clear previous markers from all layers
  for (let layer in crimeLayers) {
    crimeLayers[layer].clearLayers();
  }

  const container = containerRectangle(currentPolygon);
  const url = `https://data.police.uk/api/crimes-street/all-crime?poly=${container}&date=${selectedDate}`;
  const request = new Request(url);

  try {
    const response = await fetch(request);
    const data = await response.json();
    if (response.status === 200) {
      console.log("Success", data);

      for (let i = 0; i < data.length; i++) {
        // for (let i = 0; i < 20; i++) {

        const crimeCategory = data[i].category;
        const crimeLocation = {
          latitude: parseFloat(data[i].location.latitude),
          longitude: parseFloat(data[i].location.longitude),
        };

        //Code for placeholders
        const crimeData = crimes.find((c) => c.url === crimeCategory);
        const imageUrl =
          crimeData && crimeData.placeholder
            ? BASE_IMAGE_PATH + crimeData.placeholder
            : DEFAULT_MARKER_IMAGE;

        const customIcon = L.icon({
          iconUrl: imageUrl,
          iconSize: [18, 25],
          iconAnchor: [12.5, 12.5],
          popupAnchor: [0, -10],
        });

        // Only add the marker if the crime's location is inside the currentPolygon
        if (isLocationInsidePolygon(currentPolygon, crimeLocation)) {
          const marker = L.marker(
            [crimeLocation.latitude, crimeLocation.longitude],
            { icon: customIcon }
          );

          const popupContent = data[i].category;

          marker.bindPopup(popupContent);

          // Add the marker to the appropriate layer group based on the crime category
          if (crimeLayers[crimeCategory]) {
            crimeLayers[crimeCategory].addLayer(marker);
          }
        }
      }
    } else {
      console.log("Server Error", data.error);
    }
  } catch (error) {
    console.log("Fetch Error", error);
  }
  // Stop the timer and display the elapsed time
  console.timeEnd("getCrimes Timer");
}

//Get coordinates from Postcodes
async function getPostcodeCoordinates(postcode) {
  const url = `https://api.postcodes.io/postcodes/${postcode}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (response.status === 200 && data.result) {
      const { latitude, longitude } = data.result;
      console.log("Postcode coordinates:", latitude, longitude);
      return { latitude, longitude };
    } else {
      console.log("Server Error", data.error);
    }
  } catch (error) {
    console.log("Fetch Error", error);
  }
}

//Draw regions using a postcode
async function fetchAndDrawBoundaryPostcode(postcode) {
  //Fetch the coordinates for the given postcode
  const coords = await getPostcodeCoordinates(postcode);
  if (!coords) {
    console.log("Could not fetch coordinates for postcode:", postcode);
    return;
  }
  fetchAndDrawBoundaryCoordinates(coords.latitude, coords.longitude);
}

//Draw regions using latitude and longiute
async function fetchAndDrawBoundaryCoordinates(myLatitude, myLongitude) {
  //Fetch the police force and neighborhood ID using the coordinates
  const forceAndNeighbourhoodUrl = `https://data.police.uk/api/locate-neighbourhood?q=${myLatitude},${myLongitude}`;
  let forceId, neighbourhoodId;

  try {
    const response = await fetch(forceAndNeighbourhoodUrl);
    const data = await response.json();

    if (response.status === 200 && data) {
      forceId = data.force;
      neighbourhoodId = data.neighbourhood;

      // Check if the neighbourhood is the same as before
      if (neighbourhoodId === currentNeighbourhoodId) {
        return; // Return early without redrawing
      }
      // Update the currentNeighbourhoodId
      currentNeighbourhoodId = neighbourhoodId;

      // Fetch the name of the neighbourhood using the forceId and neighbourhoodId
      const neighbourhoodListUrl = `https://data.police.uk/api/${forceId}/neighbourhoods`;
      try {
        const neighbourhoodListResponse = await fetch(neighbourhoodListUrl);
        const neighbourhoodList = await neighbourhoodListResponse.json();
        if (
          neighbourhoodListResponse.status === 200 &&
          neighbourhoodList.length
        ) {
          // Find the neighbourhood name using the neighbourhoodId
          const matchedNeighbourhood = neighbourhoodList.find(
            (n) => n.id === neighbourhoodId
          );

          if (matchedNeighbourhood) {
            const neighbourhoodName = matchedNeighbourhood.name; // This gives the human-readable name

            // Set the neighbourhood label
            const neighbourhoodLabel = document.getElementById("neighbourhood");
            neighbourhoodLabel.textContent = `Crime in: ` + neighbourhoodName;
          } else {
            console.log(
              "Error fetching neighbourhood name:",
              neighbourhoodData.error
            );
          }
        }
      } catch (error) {
        console.log("Fetch Error", error);
      }
    } else {
      console.log("Error fetching force and neighbourhood:", data.error);
      return;
    }
  } catch (error) {
    console.log("Fetch Error", error);
    return;
  }

  //Use the police force and neighborhood ID to fetch the boundary
  const boundaryUrl = `https://data.police.uk/api/${forceId}/${neighbourhoodId}/boundary`;
  try {
    const boundaryResponse = await fetch(boundaryUrl);
    const boundaryData = await boundaryResponse.json();

    if (boundaryResponse.status === 200 && Array.isArray(boundaryData)) {
      const leafletCoords = boundaryData.map((coord) => [
        parseFloat(coord.latitude),
        parseFloat(coord.longitude),
      ]);

      // Remove the previously drawn polygon if it exists
      if (currentPolygon) {
        map.removeLayer(currentPolygon);
      }

      // Draw the new polygon and assign it to currentPolygon
      currentPolygon = L.polygon(leafletCoords).addTo(map);
    } else {
      console.log("Unexpected data structure:", boundaryData);
    }
  } catch (error) {
    console.log("Fetch Error", error);
  }
}

//Function to check if a location is inside a polygon
function isLocationInsidePolygon(polygon, location) {
  let latlngs = polygon.getLatLngs()[0];
  let x = location.latitude,
    y = location.longitude;

  let inside = false;
  for (let i = 0, j = latlngs.length - 1; i < latlngs.length; j = i++) {
    let xi = latlngs[i].lat,
      yi = latlngs[i].lng;
    let xj = latlngs[j].lat,
      yj = latlngs[j].lng;

    let intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

function containerRectangle(polygon) {
  if (!polygon || !polygon.getLatLngs || polygon.getLatLngs().length === 0) {
    console.warn("Invalid polygon provided to containerRectangle function.");
    return null;
  }

  let latlngs = polygon.getLatLngs()[0];

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  latlngs.forEach((latlng) => {
    if (latlng.lat < minLat) minLat = latlng.lat;
    if (latlng.lat > maxLat) maxLat = latlng.lat;
    if (latlng.lng < minLng) minLng = latlng.lng;
    if (latlng.lng > maxLng) maxLng = latlng.lng;
  });

  // Create and return the bounding rectangle using the computed min and max values
  return [
    [minLat, minLng].join(","), // Bottom-left corner
    [minLat, maxLng].join(","), // Bottom-right corner
    [maxLat, maxLng].join(","), // Top-right corner
    [maxLat, minLng].join(","), // Top-left corner
    [minLat, minLng].join(","), // Close the rectangle by returning to the starting point
  ].join(":");
}

// Define the OpenStreetMap tile layer
var osm = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
});

// Define the OpenStreetMap.HOT tile layer
var osmHOT = L.tileLayer(
  "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
  {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, Tiles style by <a href="https://www.hotosm.org/" target="_blank">HOT</a>',
  }
);

var baseMaps = {
  OpenStreetMap: osm,
  "OpenStreetMap.HOT": osmHOT,
};
