document.addEventListener('DOMContentLoaded', () => {
    // Function to generate buttons
    // function generateButtons() {
    //     const grid = document.getElementById('button-grid');
    //     for (let i = 0; i < 100; i++) {
    //         const button = document.createElement('button');
    //         button.id = `btn-${i}`;
    //         grid.appendChild(button);
    //     }
    // }

    // Function to assign colors to buttons based on their positions
    function assignColors() {
        const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00']; // Colors for 4 robots
        for (let i = 0; i < 10; i++) {
            const row = document.createElement('div');
            row.className = 'row';
            row.setAttribute('data-row-id', i);
            for (let j = 0; j < 10; j++) {
                const col = document.createElement('button');
                col.className = 'col';
                col.setAttribute('data-position', `${ j },${ i }`);
                row.appendChild(col);


                // const button = document.getElementById(`btn-${i * 10 + j}`);
                // if (button) { // Check if the button exists
                //     if (i === 0 && j === 0) {
                //         button.style.backgroundColor = colors[0]; // Top-left corner
                //     } else if (i === 9 && j === 0) {
                //         button.style.backgroundColor = colors[1]; // Bottom-left corner
                //     } else if (i === 0 && j === 9) {
                //         button.style.backgroundColor = colors[2]; // Top-right corner
                //     } else if (i === 9 && j === 9) {
                //         button.style.backgroundColor = colors[3]; // Bottom-right corner
                //     } else {
                //         button.style.backgroundColor = getRandomColor(); // Random color for other buttons
                //     }
                // }
            }
            document.getElementById('button-grid').appendChild(row);
        }
    }

    // Function to generate a random color
    function getRandomColor() {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }

    // Function to make buttons square
    function makeButtonsSquare() {
        const buttons = document.querySelectorAll('.grid button');
        buttons.forEach(button => {
            button.style.height = `${button.offsetWidth}px`;
        });
    }

    // Generate buttons, assign colors, and make them square when the page loads
    // generateButtons();
    assignColors();
    // makeButtonsSquare();

    // Adjust button height on window resize
    window.addEventListener('resize', makeButtonsSquare);
});