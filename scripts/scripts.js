let latitude = 51.506533;
let longitude = -0.15398;
const myForm = document.querySelector("form");
const mapElement = document.getElementById("map");
let map; // Declare the map variable outside of the functions
let markersLayer; // Declare a variable to store markers layer
let currentPolygon = null; // This will hold the reference to the drawn polygon
let selectedDate;

document.addEventListener("DOMContentLoaded", function () {
  // Wait for the DOM to be ready
  initializeMap();
  myForm.addEventListener("submit", handleFormSubmit);

  const postcodeForm = document.forms.postcodeForm;
  const postcodeInput = document.getElementById("postcode");

  postcodeForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    const postcode = postcodeInput.value.trim();
    if (postcode) {
      const coords = await getPostcodeCoordinates(postcode);
      if (coords) {
        map.setView([coords.latitude, coords.longitude], 13);
        fetchAndDrawBoundaryPostcode(postcode);
        latitude = coords.latitude;
        longitude = coords.longitude;
      }
    }
  });
});

function initializeMap() {
  // Initialize the map at the beginning
  map = L.map("map").setView([latitude, longitude], 13);

  // Add the OpenStreetMap tile layer
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  // Initialize a layer group for markers
  markersLayer = L.layerGroup().addTo(map);

  // Update the latitude and longitude input fields with the map's center coordinates
  map.addEventListener("move", () => {
    const mapCenter = map.getCenter();
    document.getElementById("latitude").value = mapCenter.lat.toFixed(6);
    document.getElementById("longitude").value = mapCenter.lng.toFixed(6);
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
  //We draw the area with the default coordinates
  fetchAndDrawBoundaryCoordinates(latitude, longitude);
}

//Get and draw placeholder crimes
function handleFormSubmit(event) {
  event.preventDefault();

  // Clear previous markers
  markersLayer.clearLayers();

  const formData = new FormData(myForm);
  const formObject = Object.fromEntries(formData);

  const newLatitude = parseFloat(formObject.latitude);
  const newLongitude = parseFloat(formObject.longitude);
  selectedDate = formObject.date;

  fetchAndDrawBoundaryCoordinates(newLatitude, newLongitude);
  getCrimes(newLatitude, newLongitude, selectedDate);
}

//Get and draw crimes
async function getCrimes(newLatitude, newLongitude, selectedDate) {
  const url = `https://data.police.uk/api/crimes-street/all-crime?lat=${newLatitude}&lng=${newLongitude}&date=${selectedDate}`;
  const request = new Request(url);

  try {
    const response = await fetch(request);
    const data = await response.json();
    if (response.status === 200) {
      console.log("Success", data);

      //for (let i = 0; i < data.length; i++) {
      for (let i = 0; i < 20; i++) {
        const crimeLocation = {
          latitude: parseFloat(data[i].location.latitude),
          longitude: parseFloat(data[i].location.longitude),
        };
        // Only add the marker if the crime's location is inside the currentPolygon
        if (isLocationInsidePolygon(currentPolygon, crimeLocation)) {
          const marker = L.marker([
            crimeLocation.latitude,
            crimeLocation.longitude,
          ]);
          const popupContent = data[i].category;

          marker.bindPopup(popupContent);
          markersLayer.addLayer(marker);
        }

        /* Version to print all the crimes no matter the region
          var marker = L.marker([
            
            data[i].location.latitude,
            data[i].location.longitude
          ]);
          const popupContent = data[i].category;
          marker.bindPopup(popupContent);
          markersLayer.addLayer(marker);*/
      }
    } else {
      console.log("Server Error", data.error);
    }
  } catch (error) {
    console.log("Fetch Error", error);
  }
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
  // Step 1: Fetch the coordinates for the given postcode
  const coords = await getPostcodeCoordinates(postcode);
  if (!coords) {
    console.log("Could not fetch coordinates for postcode:", postcode);
    return;
  }
  fetchAndDrawBoundaryCoordinates(coords.latitude, coords.longitude);
}

//Draw regions using latitude and longiute
async function fetchAndDrawBoundaryCoordinates(myLatitude, myLongitude) {
  // Step 2: Fetch the police force and neighborhood ID using the coordinates
  const forceAndNeighbourhoodUrl = `https://data.police.uk/api/locate-neighbourhood?q=${myLatitude},${myLongitude}`;
  let forceId, neighbourhoodId;

  try {
    const response = await fetch(forceAndNeighbourhoodUrl);
    const data = await response.json();

    if (response.status === 200 && data) {
      forceId = data.force;
      neighbourhoodId = data.neighbourhood;

      // Fetch the name of the neighbourhood using the forceId and neighbourhoodId
      const neighbourhoodListUrl = `https://data.police.uk/api/${forceId}/neighbourhoods`;
  try {
    const neighbourhoodListResponse = await fetch(neighbourhoodListUrl);
    const neighbourhoodList = await neighbourhoodListResponse.json();
    if (neighbourhoodListResponse.status === 200 && neighbourhoodList.length) {
      // Find the neighbourhood name using the neighbourhoodId
      const matchedNeighbourhood = neighbourhoodList.find(n => n.id === neighbourhoodId);

      if (matchedNeighbourhood) {
        const neighbourhoodName = matchedNeighbourhood.name; // This gives the human-readable name

        // Set the neighbourhood label
        const neighbourhoodLabel = document.getElementById("neighbourhood");
        neighbourhoodLabel.textContent = neighbourhoodName;

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

 

  // Step 3: Use the police force and neighborhood ID to fetch the boundary
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
