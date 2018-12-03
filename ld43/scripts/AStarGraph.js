/** A wrapper around astar js */
(function(container, astar, Graph){

class AStarGraph {
    constructor(weightGraph, options = {}) {
        this.graph = new Graph(weightGraph, options);
        // console.log(this.graph);
    }
    search(startXY = {}, endXY = {}) {
        const start = this.graph.grid[startXY.x][startXY.y];
        const end = this.graph.grid[endXY.x][endXY.y];
        // console.log(start, end);
        const result = astar.search(this.graph, start, end);
        // console.log(startXY, endXY, '--->', result);
        return result;
    }
}

container.AStarGraph = AStarGraph;

})(RocketBoots || window, astar, Graph);