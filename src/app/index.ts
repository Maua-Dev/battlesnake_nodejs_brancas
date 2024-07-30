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

function chooseMove(data: any) {
    // Get my snake parameters
    const myHead = data.you.head;
    const myBody = data.you.body;
    
    // Board size
    const boardWidth = data.board.width;
    const boardHeight = data.board.height;

    // Filter possible moves
    let directions = avoidMyNeck(myHead, myBody);
    directions = avoidWalls(myBody, directions, boardWidth, boardHeight);

    // Get move's name
    let keys = Object.keys(directions);
    return keys[Math.floor(Math.random() * keys.length)];
}

const app = express();
app.use(express.json());
app.use(router)

app.post('/start', (req: Request, res: Response) => {
    res.send("ok");
});

app.post('/move', (req: Request, res: Response) => {

    console.log(req.body);
    const move = chooseMove(req.body);
    const response = {
        move: move,
        shout: `I'm moving ${move}!`
    };
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


