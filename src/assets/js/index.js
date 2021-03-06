/*
Comments were requested, here we go :)

Here's the rundown:

This script creates a grid of cells and a separate layer of particles that
float on top of the grid. Each cell of the grid holds X and Y velocity
(direction and magnitude) values and a pressure value.

Whenever the user holds down and moves their mouse over the canvas, the velocity
of the mouse is calculated and is used to influence the velocity and pressure in
each cell that was within the defined range of the mouse coordinates. Then, the
pressure change is communicated to all of the neighboring cells of those affected,
adjusting their velocity and pressure, and this is repeated over and over until
the change propogates to all of the cells in the path of the direction of movement.

The particles are randomly placed on the canvas and move according to the
velocity of the grid cells below, similar to grass seed floating on the surface
of water as it's moving. Whenever the particles move off the edge of the canvas,
they are "dropped" back on to the canvas in a random position. The velocity,
however, is "wrapped" around to the opposite edge of the canvas. The slowing
down of the movement is simulated viscosity, which is basically frictional drag
in the liquid.


Let's get started:
--------

This is a self-invoking function. Basically, that means that it runs itself
automatically. The reason for wrapping the script in this is to isolate the
majority of the variables that I define inside from the global scope and
only reveal specific functions and values. It looks like this:

(function(argument) {

    alert(argument);

})("Yo.");

and it does the same thing as this:

function thing(argument) {

    alert(argument);

}

thing("Yo.");

*/
(function(w) {

    var canvas, ctx;

    /*
    This is an associative array to hold the status of the mouse cursor
    Whenever the mouse is moved or pressed, there are event handlers that
    update the values in this array.
    */
    var mouse = {
        x: 0,
        y: 0,
        px: 0,
        py: 0,
        down: false
    };

    /*
    These are the variable definitions for the values that will be used
    throughout the rest of the script.
    */
    var canvas_width = 2000; //Needs to be a multiple of the resolution value below.
    var canvas_height = 2000; //This too.

    var resolution = 10; //Width and height of each cell in the grid.

    var pen_size = 40; //Radius around the mouse cursor coordinates to reach when stirring

    var num_cols = canvas_width / resolution; //This value is the number of columns in the grid.
    var num_rows = canvas_height / resolution; //This is number of rows.

    var vec_cells = []; //The array that will contain the grid cells
    var particles = []; //The array that will contain the particles
    function loadImageData(imageName){
        var canvas = document.createElement('canvas');
        var context = canvas.getContext('2d');
        var img = document.getElementById(imageName);
        canvas.width = img.width;
        canvas.height = img.height;

        context.drawImage(img, 0, 0 );

        //These lines get the canvas DOM element and canvas context, respectively.
        const width=img.width;
        const height = img.height;
        const imageData = context.getImageData(0,0, img.width, img.height)
        return {width, height, imageData};
    }
    function init(imageName){

                const img = loadImageData(imageName);
        //These lines get the canvas DOM element and canvas context, respectively.
                init_particles(img.imageData, img.height, img.width);

    }
    var backGround = null;
    /*
    This is the main function. It is triggered to start the process of constructing the
    the grid and creating the particles, attaching event handlers, and starting the
    animation loop.
    */
    function randomGen(minimum,maximum){
        const return_rand = Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
        return return_rand ;
    }
    let velocity=[];
    const PARTICLES_CONSTANT= 40000;
    function init_particles(imgData, c_height, c_width) {

        //These lines get the canvas DOM element and canvas context, respectively.
        canvas = document.getElementById("c");
        ctx = canvas.getContext("2d");

//        return ;
        //These two set the width and height of the canvas to the defined values.

        /*
        This loop begins at zero and counts up to the defined number of particles,
        less one, because array elements are numbered beginning at zero.
        */

        let i;
        const increase = Math.floor(imgData.data.length/PARTICLES_CONSTANT);
        for (i = 0; i < imgData.data.length; i += +4 * randomGen(increase,increase+10)) {

            if(imgData.data[i+3] !==0){
                const x = (i / 4) % c_width;
                const y = Math.floor((i / 4) / c_width);
                const target = {x:x+(canvas.width-c_width)/2,y:y + 30};

                const colour = {r: imgData.data[i], g: imgData.data[i+1], b: imgData.data[i+2]};


                particles.push(new particle(randomGen(c_width/2,canvas.width-c_width/2), randomGen(300, 600), target, colour));
                velocity.push({vx: randomGen(1,3),vy: randomGen(1,3)});

            }
        }
        //This loops through the count of columns.
        for (let col = 0; col < num_cols; col++) {

            //This defines the array element as another array.
            vec_cells[col] = [];

            //This loops through the count of rows.
            for (let row = 0; row < num_rows; row++) {

                /*
                This line calls the cell() function, which creates an individual grid cell
                and returns it as an object. The X and Y values are multiplied by the
                resolution so that when the loops are referring to "column 2, row 2", the
                width and height of "column 1, row 1" are counted in so that the top-left
                corner of the new grid cell is at the bottom right of the other cell.
                */
                let cell_data = new cell(col * resolution, row * resolution, resolution)

                //This pushes the cell object into the grid array.
                vec_cells[col][row] = cell_data;

                /*
                These two lines set the object's column and row values so the object knows
                where in the grid it is positioned.
                */
                vec_cells[col][row].col = col;
                vec_cells[col][row].row = row;

            }
        }

        /*
        These loops move through the rows and columns of the grid array again and set letiables
        in each cell object that will hold the directional references to neighboring cells.
        For example, let's say the loop is currently on this cell:

        OOOOO
        OOOXO
        OOOOO

        These letiables will hold the references to neighboring cells so you only need to
        use "up" to refer to the cell above the one you're currently on.
        */
        for (let col = 0; col < num_cols; col++) {

            for (let row = 0; row < num_rows; row++) {

                /*
                This letiable holds the reference to the current cell in the grid. When you
                refer to an element in an array, it doesn't copy that value into the new
                letiable; the letiable stores a "link" or reference to that spot in the array.
                If the value in the array is changed, the value of this letiable would change
                also, and vice-versa.
                */
                let cell_data = vec_cells[col][row];

                /*
                Each of these lines has a ternary expression. A ternary expression is similar
                to an if/then clause and is represented as an expression (e.g. row - 1 >= 0)
                which is evaluated to either true or false. If it's true, the first value after
                the question mark is used, and if it's false, the second value is used instead.

                If you're on the first row and you move to the row above, this wraps the row
                around to the last row. This is done so that momentum that is pushed to the edge
                of the canvas is "wrapped" to the opposite side.
                */
                let row_up = (row - 1 >= 0) ? row - 1 : num_rows - 1;
                let col_left = (col - 1 >= 0) ? col - 1 : num_cols - 1;
                let col_right = (col + 1 < num_cols) ? col + 1 : 0;

                //Get the reference to the cell on the row above.
                let up = vec_cells[col][row_up];
                let left = vec_cells[col_left][row];
                let up_left = vec_cells[col_left][row_up];
                let up_right = vec_cells[col_right][row_up];

                /*
                Set the current cell's "up", "left", "up_left" and "up_right" attributes to the
                respective neighboring cells.
                */
                cell_data.up = up;
                cell_data.left = left;
                cell_data.up_left = up_left;
                cell_data.up_right = up_right;

                /*
                Set the neighboring cell's opposite attributes to point to the current cell.
                */
                up.down = vec_cells[col][row];
                left.right = vec_cells[col][row];
                up_left.down_right = vec_cells[col][row];
                up_right.down_left = vec_cells[col][row];

            }
        }


        /*
        These lines create triggers that fire when certain events happen. For
        instance, when you move your mouse, the mouse_move_handler() function
        will run and will be passed the event object reference into it's "e"
        letiable. Something to note, the mousemove event doesn't necessarily
        fire for *every* mouse coordinate position; the mouse movement is
        sampled at a certain rate, meaning that it's checked periodically, and
        if the mouse has moved, the event is fired and the current coordinates
        are sent. That's why you'll see large jumps from one pair of coordinates
        to the next if you move your mouse very fast across the screen. That's
        also how I measure the mouse's velocity.
        */
        w.addEventListener("mousedown", mouse_down_handler);
        w.addEventListener("touchstart", mouse_down_handler);

        w.addEventListener("mouseup", mouse_up_handler);
        w.addEventListener("touchend", touch_end_handler);

        canvas.addEventListener("mousemove", mouse_move_handler);

        //When the page is finished loading, run the draw() function.
        w.onload = draw;


    }
    function distance (a,b){
        return Math.sqrt((a.x-b.x)*(a.x-b.x) + (a.y-b.y)*(a.y-b.y));
    }
    function length(a){
        return Math.sqrt(a.x*a.x+a.y*a.y);
    }
    /*
    calculate normalized vector of distance vector between two points
     */
    function pDirection(a, b, i){
        function normalize(a,b){
            const c = {x:b.x-a.x, y:b.y-a.y};
            if(typeof i ==='undefined') return {x:((c.x/length(c))), y: (c.y/length(c))};
            if(distance(a,b)>4  )
                return {x:((c.x/length(c)))* velocity[i].vx, y: (c.y/length(c)) *velocity[i].vy};
            return{x:0.01,y:0.01};
        }

        return normalize(a,b);
    }
    /*
    calculate distance between two points
     */

    /*
    This function updates the position of the particles according to the velocity
    of the cells underneath, and also draws them to the canvas.
    */
    function update_particle() {
        //Loops through all of the particles in the array
        for (let i = 0; i < particles.length; i++) {

            //Sets this letiable to the current particle so we can refer to the particle easier.
            let p = particles[i];

            //If the particle's X and Y coordinates are within the bounds of the canvas...
            if (p.x >= 0 && p.x < canvas_width && p.y >= 0 && p.y < canvas_height ) {

                /*
                These lines divide the X and Y values by the size of each cell. This number is
                then parsed to a whole number to determine which grid cell the particle is above.
                */
                let col = parseInt(p.x / resolution);
                let row = parseInt(p.y / resolution);

                //Same as above, store reference to cell
                let cell_data = vec_cells[col][row];

                /*
                These values are percentages. They represent the percentage of the distance across
                the cell (for each axis) that the particle is positioned. To give an example, if
                the particle is directly in the center of the cell, these values would both be "0.5"

                The modulus operator (%) is used to get the remainder from dividing the particle's
                coordinates by the resolution value. This number can only be smaller than the
                resolution, so we divide it by the resolution to get the percentage.
                */
                let ax = (p.x % resolution) / resolution;
                let ay = (p.y % resolution) / resolution;

                /*
                These lines subtract the decimal from 1 to reverse it (e.g. 100% - 75% = 25%), multiply
                that value by the cell's velocity, and then by 0.05 to greatly reduce the overall change in velocity
                per frame (this slows down the movement). Then they add that value to the particle's velocity
                in each axis. This is done so that the change in velocity is incrementally made as the
                particle reaches the end of it's path across the cell.
                */
                p.xv += (1 - ax) * cell_data.xv * 0.05;
                p.yv += (1 - ay) * cell_data.yv * 0.05;

                /*
                These next four lines are are pretty much the same, except the neighboring cell's
                velocities are being used to affect the particle's movement. If you were to comment
                them out, the particles would begin grouping at the boundary between cells because
                the neighboring cells wouldn't be able to pull the particle into their boundaries.
                */
                p.xv += ax * cell_data.right.xv * 0.05;
                p.yv += ax * cell_data.right.yv * 0.05;

                if (distance(p, p.target) > 1) {
                    p.xv += pDirection(p, p.target, i).x*2;
                    p.yv += pDirection(p, p.target, i).y*2;
                }
                //This adds the calculated velocity to the position coordinates of the particle.

                p.x += p.xv;
                p.y += p.yv;

                //For each axis, this gets the distance between the old position of the particle and it's new position.

                let dx = p.px - p.x;
                let dy = p.py - p.y;

                //Using the Pythagorean theorum (A^2 + B^2 = C^2), this determines the distance the particle travelled.
                let dist = Math.sqrt(dx * dx + dy * dy);

                //This line generates a random value between 0 and 0.5
                let limit = Math.random() * 0.5;

                //If the distance the particle has travelled this frame is greater than the random value...
                if (distance(p, p.target) > 3) {
                    if (dist > limit) {
                        ctx.lineWidth = 2;
                        ctx.beginPath(); //Begin a new path on the canvas
                        ctx.moveTo(p.x, p.y); //Move the drawing cursor to the starting point
                        ctx.lineTo(p.px, p.py);
                        ctx.strokeStyle = p.colour;
                        ctx.stroke(); //Draw the path to the canvas


                    } else {
                        //If the particle hasn't moved further than the random limit...

                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);

                        /*
                        Describe a line from the particle's current coordinates to those same coordinates
                        plus the random value. This is what creates the shimmering effect while the particles
                        aren't moving.
                        */
                        ctx.lineTo(p.x + limit, p.y + limit);

                        ctx.stroke();
                    }
                }
                else{
                    ctx.lineWidth = 2;
                    ctx.beginPath(); //Begin a new path on the canvas
                    ctx.moveTo(p.x, p.y); //Move the drawing cursor to the starting point
                    ctx.lineTo(p.x+1, p.y+1);
                    ctx.strokeStyle = p.colour;
                    ctx.stroke(); //Draw the path to the canvas
                }
                //This updates the previous X and Y coordinates of the particle to the new ones for the next loop.
                p.px = p.x;
                p.py = p.y;
            } else {
                //If the particle's X and Y coordinates are outside the bounds of the canvas...

                //Place the particle at a random location on the canvas
                p.x = p.px = Math.random() * canvas_width;
                p.y = p.py = Math.random() * canvas_height;


            }

            //These lines divide the particle's velocity in half everytime it loops, slowing them over time.
            p.xv *= 0.5;
            p.yv *= 0.5;
        }
    }
    function update_circle() {
        //Loops through all of the particles in the array
        for (let i = 0; i < particles.length; i++) {

            //Sets this letiable to the current particle so we can refer to the particle easier.
            let p = particles[i];

            //If the particle's X and Y coordinates are within the bounds of the canvas...
            if (p.x >= 0 && p.x < canvas_width && p.y >= 0 && p.y < canvas_height) {

                /*
                These lines divide the X and Y values by the size of each cell. This number is
                then parsed to a whole number to determine which grid cell the particle is above.
                */
                let col = parseInt(p.x / resolution);
                let row = parseInt(p.y / resolution);

                //Same as above, store reference to cell
                let cell_data = vec_cells[col][row];

                /*
                These values are percentages. They represent the percentage of the distance across
                the cell (for each axis) that the particle is positioned. To give an example, if
                the particle is directly in the center of the cell, these values would both be "0.5"

                The modulus operator (%) is used to get the remainder from dividing the particle's
                coordinates by the resolution value. This number can only be smaller than the
                resolution, so we divide it by the resolution to get the percentage.
                */
                let ax = (p.x % resolution) / resolution;
                let ay = (p.y % resolution) / resolution;

                /*
                These lines subtract the decimal from 1 to reverse it (e.g. 100% - 75% = 25%), multiply
                that value by the cell's velocity, and then by 0.05 to greatly reduce the overall change in velocity
                per frame (this slows down the movement). Then they add that value to the particle's velocity
                in each axis. This is done so that the change in velocity is incrementally made as the
                particle reaches the end of it's path across the cell.
                */
                p.xv += (1 - ax) * cell_data.xv * 0.05;
                p.yv += (1 - ay) * cell_data.yv * 0.05;

                /*
                These next four lines are are pretty much the same, except the neighboring cell's
                velocities are being used to affect the particle's movement. If you were to comment
                them out, the particles would begin grouping at the boundary between cells because
                the neighboring cells wouldn't be able to pull the particle into their boundaries.
                */
                p.xv += ax * cell_data.right.xv * 0.05;
                p.yv += ax * cell_data.right.yv * 0.05;

                if(distance(p,p.target)!==0){
                    p.xv += pDirection(p,p.target, i).x;
                    p.yv += pDirection(p,p.target, i).y;
                }
                //This adds the calculated velocity to the position coordinates of the particle.

                p.x += p.xv;
                p.y += p.yv;

                //For each axis, this gets the distance between the old position of the particle and it's new position.

                let dx = p.px - p.x;
                let dy = p.py - p.y;

                //Using the Pythagorean theorum (A^2 + B^2 = C^2), this determines the distance the particle travelled.
                let dist = Math.sqrt(dx * dx + dy * dy);

                //This line generates a random value between 0 and 0.5
                let limit = Math.random() * 0.5;

                //If the distance the particle has travelled this frame is greater than the random value...
                if(p.target.x - p.x <= 3 && p.target.y - p.y <= 3) {
                    ctx.beginPath();
                    ctx.arc(p.target.x, p.target.y, 6, 0, 2 * Math.PI);
                    ctx.fillStyle = p.colour;
                    ctx.fill();
                    ctx.stroke();
                    p.xv *= 0.2;
                    p.yv *= 0.2;
                }
                else if (dist > limit) {
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, 6, 0, 2 * Math.PI);
                    ctx.fillStyle = p.colour;
                    ctx.fill();
                    ctx.stroke();
                }else{
                    //If the particle hasn't moved further than the random limit...
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, 6, 0, 2 * Math.PI);
                    ctx.fillStyle = p.colour;
                    ctx.fill();
                    ctx.stroke();

                }

                //This updates the previous X and Y coordinates of the particle to the new ones for the next loop.
                p.px = p.x;
                p.py = p.y;
            }
            else {
                //If the particle's X and Y coordinates are outside the bounds of the canvas...

                //Place the particle at a random location on the canvas
                p.x = p.px = Math.random() * canvas_width;
                p.y = p.py = Math.random() * canvas_height;


            }

            //These lines divide the particle's velocity in half everytime it loops, slowing them over time.
            p.xv *= 0.8;
            p.yv *= 0.8;
        }
    }
    let updateParticle=true;

    /*
    This is the main animation loop. It is run once from the init() function when the page is fully loaded and
    uses RequestAnimationFrame to run itself again and again.
    */
    function draw() {
        /*
        This calculates the velocity of the mouse by getting the distance between the last coordinates and
        the new ones. The coordinates will be further apart depending on how fast the mouse is moving.
        */
        let end = new Date().getTime();
        if(end - start > 10000) {
            nextPage();
            start = end;
        }
        //Loops through all of the columns
        for (let i = 0; i < vec_cells.length; i++) {
            let cell_datas = vec_cells[i];

            //Loops through all of the rows
            for (let j = 0; j < cell_datas.length; j++) {

                //References the current cell
                let cell_data = cell_datas[j];

                //If the mouse button is down, updates the cell velocity using the mouse velocity
                if (mouse.down && change.state || Math.abs(change.target.x - change.start.x)  > 20 || Math.abs(change.target.y - change.start.y)  > 20 ) {
                    // change_cell_velocity(cell_data, mouse_xv, mouse_yv, pen_size);
                    change_cell_velocity_custom(cell_data, pDirection(change.start, change.target).x*100, pDirection(change.start, change.target).y*100, pen_size);
                    change.start.x += pDirection(change.start, change.target).x*0.001;
                    change.start.y += pDirection(change.start, change.target).y*0.001;

                    //


                }else if(change.state){
                    change = changes.pop()
                    //if(!change.state)
                    //    update_particle_target();
                    change.update();
                }
                //This updates the pressure values for the cell.
                update_pressure(cell_data);
            }
        }

        /*
        This line clears the canvas. It needs to be cleared every time a new frame is drawn
        so the particles move. Otherwise, the particles would just look like long curvy lines.
        */
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if(backGround !== null)
            ctx.drawImage(backGround, (canvas.width-backGround.width)/2, (canvas.height-backGround.height) );

        //This sets the color to draw with.

        //This calls the function to update the particle positions.
        if(updateParticle)
            update_particle();
        else
            update_circle();
        /*
        This calls the function to update the cell velocity for every cell by looping through
        all of the rows and columns.
        */

        for (let i = 0; i < vec_cells.length; i++) {
            let cell_datas = vec_cells[i];

            for (let j = 0; j < cell_datas.length; j++) {
                let cell_data = cell_datas[j];

                update_velocity(cell_data);

            }
        }

        //This replaces the previous mouse coordinates values with the current ones for the next frame.
        mouse.px = mouse.x;
        mouse.py = mouse.y;

        //This requests the next animation frame which runs the draw() function again.
        requestAnimationFrame(draw);

    }



    /*
       This function changes the cell velocity of an individual cell by first determining whether the cell is
       close enough to the mouse cursor to be affected, and then if it is, by calculating the effect that mouse velocity
       has on the cell's velocity.
       */
    function change_cell_velocity_custom(cell_data, mvelX, mvelY, pen_size) {
        //This gets the distance between the cell and the mouse cursor.
        let dx = cell_data.x - change.start.x;
        let dy = cell_data.y - change.start.y;
        let dist = Math.sqrt(dy * dy + dx * dx);

        //If the distance is less than the radius...
        if (dist < pen_size) {

            //If the distance is very small, set it to the pen_size.
            if (dist < 4) {
                dist = pen_size;
            }

            //Calculate the magnitude of the mouse's effect (closer is stronger)
            let power = pen_size / dist;

            /*
            Apply the velocity to the cell by multiplying the power by the mouse velocity and adding it to the cell velocity
            */
            cell_data.xv += mvelX * power;
            cell_data.yv += mvelY * power;
        }
    }

    /*
    This function updates the pressure value for an individual cell using the
    pressures of neighboring cells.
    */
    function update_pressure(cell_data) {

        //This calculates the collective pressure on the X axis by summing the surrounding velocities
        let pressure_x = (
            cell_data.up_left.xv * 0.5 //Divided in half because it's diagonal
            + cell_data.left.xv
            + cell_data.down_left.xv * 0.5 //Same
            - cell_data.up_right.xv * 0.5 //Same
            - cell_data.right.xv
            - cell_data.down_right.xv * 0.5 //Same
        );

        //This does the same for the Y axis.
        let pressure_y = (
            cell_data.up_left.yv * 0.5
            + cell_data.up.yv
            + cell_data.up_right.yv * 0.5
            - cell_data.down_left.yv * 0.5
            - cell_data.down.yv
            - cell_data.down_right.yv * 0.5
        );

        //This sets the cell pressure to one-fourth the sum of both axis pressure.
        cell_data.pressure = (pressure_x + pressure_y) * 0.25;
    }


    /*
    This function updates the velocity value for an individual cell using the
    velocities of neighboring cells.
    */
    function update_velocity(cell_data) {

        /*
        This adds one-fourth of the collective pressure from surrounding cells to the
        cell's X axis velocity.
        */
        cell_data.xv += (
            cell_data.up_left.pressure * 0.5
            + cell_data.left.pressure
            + cell_data.down_left.pressure * 0.5
            - cell_data.up_right.pressure * 0.5
            - cell_data.right.pressure
            - cell_data.down_right.pressure * 0.5
        ) * 0.25;

        //This does the same for the Y axis.
        cell_data.yv += (
            cell_data.up_left.pressure * 0.5
            + cell_data.up.pressure
            + cell_data.up_right.pressure * 0.5
            - cell_data.down_left.pressure * 0.5
            - cell_data.down.pressure
            - cell_data.down_right.pressure * 0.5
        ) * 0.25;

        /*
        This slowly decreases the cell's velocity over time so that the fluid stops
        if it's left alone.
        */
        cell_data.xv *= 0.99;
        cell_data.yv *= 0.99;
    }


    //This function is used to create a cell object.
    function cell(x, y, res) {

        //This stores the position to place the cell on the canvas
        this.x = x;
        this.y = y;

        //This is the width and height of the cell
        this.r = res;

        //These are the attributes that will hold the row and column values
        this.col = 0;
        this.row = 0;

        //This stores the cell's velocity
        this.xv = 0;
        this.yv = 0;

        //This is the pressure attribute
        this.pressure = 0;

    }

    function rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }
    //This function is used to create a particle object.
    function particle(x, y, target, colour) {

        this.colour = rgbToHex(colour.r,colour.g,colour.b);
        this.x = this.px = x;
        this.y = this.py = y;

        this.xv = this.yv = 0;
        this.target = {x: target.x,y: target.y};

    }

    /*
    This function is called whenever the mouse button is pressed. The event object is passed to
    this function when it's called.
    */
    let changes = [];
    function setChanges(){
        for (let i = 0 ; i < 5 ; i++){
            const up_y =  100;
            const left_x = 500;
            const right_x = 1300;
            let x;
            if(i===0){
                x = {state:false, start:{x:left_x,y:up_y},target:{x:right_x,y:up_y}, update: update_particle_target};
            }else
            if(i%2===0)
                x = {state:true, start:{x:left_x,y:up_y+i*100},target:{x:right_x,y:up_y+i*100}, update:function(){return null}};
            else
                x = {state:true, start:{x:right_x,y:up_y+i*100},target:{x:left_x,y:up_y+i*100}, update:function(){return null}};
            changes.push(x)
            changes.push(x)
        }
    }
    let imagesArray=['logoColorSmall','logo4','logoColorSmall','logo3','logoColorSmall','logo2'];
    let imagesArrayLength = imagesArray.length;
    let  start = new Date().getTime();
    function update_particle_target(){
        const img = loadImageData(imagesArray.pop());
        if(changeCnt%2!==0)
            update_particle_image(img.imageData,img.width,0);
        else
            update_particle_image(img.imageData,img.width, 300);
    }
    function update_particle_image(imgData, width, height){
        const increase = Math.floor(imgData.data.length/PARTICLES_CONSTANT);
        let u = 0;
        while(u< particles.length){
            for (let i = 0; i < imgData.data.length && u < particles.length; i += 4 * randomGen(increase, increase+10)) {
                if(imgData.data[i+3] !==0){
                    const x = (i / 4) % width;
                    const y = Math.floor((i / 4) / width);
                    const target = {x:x+(canvas.width-width)/2,y:y + 30+height};

                    //  particles[u].colour = rgbToHex(colour.r,colour.g,colour.b);
                    particles[u].target = target;
                    u+=1;
                }


            }
        }
    }
    //let changes = [{state:false, start:{x:1000,y:1000},target:{x:1256,y:1700}}, {state:true, start:{x:700,y:1300},target:{x:1256, y:1700}}, {state:true, start:{x:700,y:1000},target:{x:1500,y:1200}}]
    let change = {state:false, start:{x:0,y:0},target:{x:0,y:0}};
    let changeCnt = 1;
    function mouse_down_handler(e) {
        e.preventDefault(); //Prevents the default action from happening (e.g. navigation)

//        if(change)

    }
    function nextPage(){
        if(changeCnt > imagesArrayLength)
            return;
        if(changeCnt%2!==0){
            setChanges();
            change.state = true;
            change = changes.pop();
        }
        if(changeCnt%2===0){
            setChanges();
            change = changes.pop();

        }
//        if(change)

        changeCnt +=1;
    }

    //This function is called whenever the mouse button is released.
    function mouse_up_handler() {
        mouse.down = false;
    }


    //This function is called whenever a touch point is removed from the screen.
    function touch_end_handler(e) {
        if (!e.touches) mouse.down = false; //If there are no more touches on the screen, sets "down" to false.
    }


    /*
    This function is called whenever the mouse coordinates have changed. The coordinates are checked by the
    browser at intervals.
    */
    function mouse_move_handler(e) {
        //Saves the previous coordinates
        mouse.px = mouse.x;
        mouse.py = mouse.y;
        //Sets the new coordinates
        mouse.x = e.offsetX || e.layerX;
        mouse.y = e.offsetY || e.layerY;

    }




    /*
    And this line attaches an object called "Fluid" to the global scope. "window" was passed into
    the self-invoking function as "w", so setting "w.Fluid" adds it to "window".
    */
    w.Fluid = {
        initialize: init
    }

}(window)); //Passes "window" into the self-invoking function.


/*
Request animation frame polyfill. This enables you to use "requestAnimationFrame"
regardless of the browser the script is running in.
*/
window.requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame;


//And this line calls the init() function defined above to start the script.
export default window.Fluid;
