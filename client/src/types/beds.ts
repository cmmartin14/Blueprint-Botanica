import { Shape } from "./shapes"

export class Bed {
  id: string //Shape IDs are stored as strings, so I'll store them as strings for beds too
  shapeIDs: string[];  // Array to hold shape IDs 

  constructor(shapeID: string, id: string) {
    // Initialize the array and add the provided ID
    this.id = id
    this.shapeIDs = [shapeID];//put the first created shape in the shapeID list
  }
}