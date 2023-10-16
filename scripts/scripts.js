let latitude = 51.55848;
let longitude = -0.11337;
const myForm = document.querySelector("form");
const mapElement = document.getElementById("map");
let map; // Declare the map variable outside of the functions
let markersLayer; // Declare a variable to store markers layer

document.addEventListener("DOMContentLoaded", function () {
  // Wait for the DOM to be ready
  initializeMap();
  myForm.addEventListener("submit", handleFormSubmit);
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

  map.addEventListener("move", () => {
    const mapCenter = map.getCenter();
    // Update the latitude and longitude input fields with the map's center coordinates
    document.getElementById("latitude").value = mapCenter.lat.toFixed(6);
    document.getElementById("longitude").value = mapCenter.lng.toFixed(6);
  });
}

//Police
function handleFormSubmit(event) {
  event.preventDefault();

  // Clear previous markers
  markersLayer.clearLayers();

  const formData = new FormData(myForm);
  const formObject = Object.fromEntries(formData);

  const newLatitude = parseFloat(formObject.latitude);
  const newLongitude = parseFloat(formObject.longitude);
  const newDate = formObject.date;

  const url = `https://data.police.uk/api/crimes-street/all-crime?lat=${newLatitude}&lng=${newLongitude}&date=${newDate}`;
  const request = new Request(url);

  async function getData() {
    try {
      const response = await fetch(request);
      const data = await response.json();
      if (response.status === 200) {
        console.log("Success", data);
        for (let i = 0; i < 400; i++) {
          var marker = L.marker([
            data[i].location.latitude,
            data[i].location.longitude,
          ]);
          const popupContent = data[i].category;
          marker.bindPopup(popupContent);
          markersLayer.addLayer(marker);
        }
      } else {
        console.log("Server Error", data.error);
      }
    } catch (error) {
      console.log("Fetch Error", error);
    }
  }
  getData();
}

/*//News
const apiKey = "801d3276710442a5830455e153a24b1f";
const url =
  "https://newsapi.org/v2/everything?q=tesla&from=2023-10-14&sortBy=publishedAt&apiKey=";
const completeUrl = url + apiKey;
console.log(completeUrl);

const request = new Request(completeUrl);

async function getData() {
  try {
    const response = await fetch(request);
    const data = await response.json();
    if (response.status === 200) {
      console.log("Success", data);
    } else {
      console.log("Server Error", data.error);
    }
  } catch (error) {
    console.log("Fetch Error", error);
  }
}
getData();*/
