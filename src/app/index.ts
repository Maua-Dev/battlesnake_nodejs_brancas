import { config } from 'dotenv';
config()
import express, { Request, Response } from 'express';
import ServerlessHttp from 'serverless-http';
import { STAGE } from './enums/stage_enum';
import { router } from './routes/snake_routes'


// Define functions for the game strat
function specifyMove(directions: { [key: string]: Point }) {
    // Get possible move's keys
    let keys = Object.keys(directions);

    // If there is no possible move, loses
    let move;
    let shout;

    if (keys.length === 0) {
        move = 'up';
        shout = 'I lost!';
    }
    else{
        move = keys[Math.floor(Math.random() * keys.length)];
        shout = `I'm moving ${move}!`;
    }

    return {
        move, shout
    };
}

interface Point {
    x: number;
    y: number;
}

function avoidMyNeck(myHead: any, myBody: Array<any>) {
    const possibleMoves: { [key: string]: Point } = {
        up: { x: myHead.x, y: myHead.y + 1 },
        down: { x: myHead.x, y: myHead.y - 1 },
        left: { x: myHead.x - 1, y: myHead.y },
        right: { x: myHead.x + 1, y: myHead.y }
    }

    // Remover movimentos que colidem com o próprio corpo
    const remove: string[] = [];
    for (const move in possibleMoves) {
        if (myBody.some(segment => segment.x === possibleMoves[move].x && segment.y === possibleMoves[move].y)) {
            remove.push(move);
        }
    }

    // Filtrar movimentos
    remove.forEach(move => {
        delete possibleMoves[move];
    });

   return possibleMoves;

}

function avoidWalls(myBody: Array<any>, directions: { [key: string]: Point }, boardWidth: number, boardHeight: number) {
    // Remove moves that collide with walls
    for (const move in directions) {
        if (directions[move].x < 0 || directions[move].x >= boardWidth || directions[move].y < 0 || directions[move].y >= boardHeight) {
            delete directions[move];
        }
    }

    return directions;
}

interface Snake {
    body: Array<Point>;
    id: String,
    name: String,
    health: number
    latency: String,
    head: Point,
    length: number,
    shout: String
    squad: String
    customizations: any
}

function avoidSnakes(myBody: Array<Point>, directions: { [key: string]: Point }, snakes: Array<Snake>) {
    // Remove moves that collide with other snakes
    for (const snake of snakes) {
        for (const move in directions) {
            if (snake.body.some((segment: Point) => segment.x === directions[move].x && segment.y === directions[move].y)) {
                delete directions[move];
            }
        }
    }

    return directions;
}

function getCloseFood(foods: Array<Point>, myHead: Point, directions: { [key: string]: Point }) {
    // Get the closest food
    let closestFood = foods[0];
    let minDistance = Math.abs(myHead.x - closestFood.x) + Math.abs(myHead.y - closestFood.y);
    for (const food of foods) {
        const distance = Math.abs(myHead.x - food.x) + Math.abs(myHead.y - food.y);
        if (distance < minDistance) {
            closestFood = food;
            minDistance = distance;
        }
    }

    // Get the direction to the closest food
    const directionX = myHead.x < closestFood.x ? 'right' : myHead.x > closestFood.x ? 'left' : '';
    const directionY = myHead.y < closestFood.y ? 'up' : myHead.y > closestFood.y ? 'down' : '';

    // Remove moves that are not in the direction of the closest food
    const bestDirections: { [key: string]: Point } = Object.assign({}, directions);
    for (const move in bestDirections) {
        if (directionX !== '' && move !== directionX) {
            delete bestDirections[move];
        }
        if (directionY !== '' && move !== directionY) {
            delete bestDirections[move];
        }
    }

    // Check if bestDirections is possible
    if (Object.keys(bestDirections).length === 0) {
        return directions;
    }
    else{
        return bestDirections;
    }
}

export function getLoopingPosition(myHead: Point, myBody: Array<Point>) {
    // Get the the direction and coords of my tail and return the direction to it
    const myTail = myBody[myBody.length - 1];
    const thirdPart = myBody[myBody.length - 2];
    let possibleMoves: { [key: string]: Point } = {};
    if (thirdPart.y === myHead.y) {
        possibleMoves = {
            up: { x: myHead.x, y: myHead.y + 1 },
            down: { x: myHead.x, y: myHead.y - 1 },
        }
    }
    else if(thirdPart.x === myHead.x){
        possibleMoves = {
            left: { x: myHead.x - 1, y: myHead.y },
            right: { x: myHead.x + 1, y: myHead.y }
        }
    }
    else{
        const directionX = myHead.x < myTail.x ? 'right' : myHead.x > myTail.x ? 'left' : '';
        const directionY = myHead.y < myTail.y ? 'up' : myHead.y > myTail.y ? 'down' : '';

        if (directionX === 'right') {
            possibleMoves['right'] = { x: myHead.x + 1, y: myHead.y };
        }
        if (directionY === 'up') {
            possibleMoves['up'] = { x: myHead.x, y: myHead.y + 1 };
        }
        if (directionX === 'left') {
            possibleMoves['left'] = { x: myHead.x - 1, y: myHead.y };
        }
        if (directionY === 'down') {
            possibleMoves['down'] = { x: myHead.x, y: myHead.y - 1 };
        }
    }

    return possibleMoves;
}


function chooseMove(data: any) {
    // Get my snake parameters
    const myHead = data.you.head;
    const myBody = data.you.body;
    const mySize = myBody.length;
    const myHealth = data.you.health;
    
    // Board size
    const boardWidth = data.board.width;
    const boardHeight = data.board.height;

    // Get board objects
    const snakes = data.board.snakes;
    const foods = data.board.food;


    // Filter possible moves
    let directions = avoidMyNeck(myHead, myBody);
    directions = avoidWalls(myBody, directions, boardWidth, boardHeight);
    directions = avoidSnakes(myBody, directions, snakes);

    // Check if I have lenght 4
    if (mySize === 4) {
        // If I have length 4, check my health
        if (myHealth < 33) {
            // If my health is low, get some food
            directions = getCloseFood(foods, myHead, directions);
        }
        else{
            // Start looping
            const getLoopingValues = getLoopingPosition(myHead, myBody);
            const keysLoop = Object.keys(getLoopingValues);
            const keysDir = Object.keys(directions);
            const intersection = keysLoop.filter(key => keysDir.includes(key));
            if (intersection.length > 0) {
                const newDirections: { [key: string]: Point } = {};
                intersection.forEach(key => {
                    newDirections[key] = directions[key];
                });

                directions = newDirections;
            }
            else{
                directions = getLoopingValues;
            }
        }
    }
    else{
        // If I don't have length 4, get some food
        directions = getCloseFood(foods, myHead, directions);
    }

    // Get possible move's keys
    return specifyMove(directions);
}

const app = express();
app.use(express.json());
app.use(router)

app.post('/start', (req: Request, res: Response) => {
    res.send("ok");
});

app.post('/move', (req: Request, res: Response) => {

    // console.log(req.body);
    const response = chooseMove(req.body);
    res.json(response);
});

app.post('/end', (req: Request, res: Response) => {
    res.send("ok");
});

console.log('process.env.STAGE: ' + process.env.STAGE)

if (process.env.STAGE === STAGE.TEST) {
    app.listen(3000, () => {console.log('Server up and running on: http://localhost:3000 🚀')})
} else {
    module.exports.handler = ServerlessHttp(app)
}


