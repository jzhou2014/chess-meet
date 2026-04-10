export class ChessEngine {
    private engine: Worker | null;
    private isReady: boolean = false;
    private moveCallback: ((bestMove: string) => void) | null = null;

    constructor() {
        // this.engine = new Engine('./stockfish.js');
        this.engine =
            typeof Worker !== "undefined" ? new (window.Worker)("/stockfish.js") : null;
        this.initEngine();
    }

    private initEngine() {
        if (this.engine) {
            this.engine.onmessage = (event: MessageEvent) => {
                const msg = event.data;
                if (msg === 'uciok') {
                    this.engine!.postMessage('isready');
                } else if (msg === 'readyok') {
                    this.isReady = true;
                } else if (msg.startsWith('bestmove')) {
                    const bestMove = msg.split(' ')[1];
                    if (this.moveCallback) {
                        this.moveCallback(bestMove);
                    }
                }
            };

            this.engine.postMessage('uci');
        }
    }

    async getBestMove(fen: string, depth: number = 18): Promise<string> {
        return new Promise((resolve) => {
            if (!this.isReady) {
                setTimeout(() => this.getBestMove(fen, depth).then(resolve), 100);
                return;
            }

            this.moveCallback = (bestMove: string) => {
                this.moveCallback = null;
                resolve(bestMove);
            };

            if (this.engine) {
                this.engine.postMessage('position fen ' + fen);
                this.engine.postMessage('go depth ' + depth);
            }
        });
    }

    setSkillLevel(level: number) {
        // Ensure level is between 0 and 20
        level = Math.max(0, Math.min(20, level));
        if (this.engine) {
            this.engine.postMessage('setoption name Skill Level value ' + level);
        }
    }

    destroy() {
        if (this.engine) {
            this.engine.postMessage('quit');
        }
    }
}