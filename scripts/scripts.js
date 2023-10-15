let latitude = 51.55848;
let longitude = -0.11337;

document.addEventListener("DOMContentLoaded", function () {
  // Wait for the DOM to be ready
  // Initialize the map when the DOM is ready
  updateMap(latitude, longitude);
});

function updateMap(varLatitude, varLongitude) {
  //setView([coordinates], ZoomLevel);
  var map = L.map("map").setView([varLatitude, varLongitude], 33);
  // Add the OpenStreetMap tile layer
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);
}

const myForm = document.querySelector("form");
myForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(myForm);
  // Convert FormData into a plain object
  const formObject = Object.fromEntries(formData);

  // Extract latitude and longitude values from the form
  const newLatitude = parseFloat(formObject.latitude);
  const newLongitude = parseFloat(formObject.longitude);

  // Call updateMap with the new latitude and longitude
  updateMap(newLatitude, newLongitude);
});
