document.addEventListener('DOMContentLoaded', () => {

    // Function to assign colors to buttons based on their positions
    function generateButtons() {
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

            }
            document.getElementById('button-grid').appendChild(row);
        }
    }

    // Generate buttons, assign colors, and make them square when the page loads
    generateButtons();
    // assignColors();
    // makeButtonsSquare();

});