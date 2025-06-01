// Get references to the HTML elements by their IDs
const dynamicTextElement = document.getElementById('dynamicText');
const changeTextButton = document.getElementById('changeTextButton');

// Define an array of texts to cycle through
const texts = [
    "Hello from Vanilla JS!",
    "This is built without React.",
    "Direct DOM manipulation!",
    "It works just the same!",
    "HTML, CSS, and JS power."
];

// Keep track of the current text index
let currentIndex = 0;

// Function to update the text displayed on the screen
function updateText() {
    dynamicTextElement.textContent = texts[currentIndex];
}

// Add an event listener to the button
changeTextButton.addEventListener('click', () => {
    // Increment the index
    currentIndex++;

    // If we've reached the end of the texts array, loop back to the beginning
    if (currentIndex >= texts.length) {
        currentIndex = 0;
    }

    // Call the function to update the text
    updateText();
});

// Set the initial text when the page loads
updateText();