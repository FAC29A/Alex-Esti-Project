let latitude = 51.55848;
let longitude = -0.11337;
const myForm = document.querySelector("form");
const mapElement = document.getElementById("map");
let map; // Declare the map variable outside of the functions

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
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);
}

function handleFormSubmit(event) {
  event.preventDefault();
  const formData = new FormData(myForm);
  const formObject = Object.fromEntries(formData);

  const newLatitude = parseFloat(formObject.latitude);
  const newLongitude = parseFloat(formObject.longitude);

  updateMap(newLatitude, newLongitude);
}

function updateMap(varLatitude, varLongitude) {
  map.setView([varLatitude, varLongitude], 13);
  console.log(`Updating map`);
}
