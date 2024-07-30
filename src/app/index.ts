import { config } from 'dotenv';
config()
import express, { Request, Response } from 'express';
import ServerlessHttp from 'serverless-http';
import { STAGE } from './enums/stage_enum';
import { router } from './routes/snake_routes'


// Define functions for the game strat
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

function chooseMove(data: any) {
    // Get my snake parameters
    const myHead = data.you.head;
    const myBody = data.you.body;
    
    // Board size
    const boardWidth = data.board.width;
    const boardHeight = data.board.height;

    // Get snakes parameters
    const snakes = data.board.snakes;

    // Filter possible moves
    let directions = avoidMyNeck(myHead, myBody);
    directions = avoidWalls(myBody, directions, boardWidth, boardHeight);
    directions = avoidSnakes(myBody, directions, snakes);

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

const app = express();
app.use(express.json());
app.use(router)

app.post('/start', (req: Request, res: Response) => {
    res.send("ok");
});

app.post('/move', (req: Request, res: Response) => {

    console.log(req.body);
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


