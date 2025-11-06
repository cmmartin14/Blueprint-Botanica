import { Shape } from "./shapes"

export class Bed {
  bedIDs: number[];  // Array to hold shape IDs, so that 

  constructor(id: number) {
    // Initialize the array and add the provided ID
    this.bedIDs = [id];
  }

  addShape(id: number) {
    this.bedIDs.push(id);
  }
}