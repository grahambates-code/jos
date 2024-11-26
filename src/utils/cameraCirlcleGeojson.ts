import { bearing, featureCollection, point, circle as outerCircle } from "@turf/turf";

export interface CircleParameters {
  lattitude: number;
  longitude: number;
  altitude: number;
  radius: number;
  numberOfPoints: number;
  locationId: string;
}

export const createCircle = (circleParams: CircleParameters) => {
  //here we collect the points which we will draw around the vertical axis
  let points = [];
  //the center of our "circle"
  const center = point([circleParams.longitude, circleParams.lattitude]);
  // we crate the number of points we need around the radius points (this is poligon at this point)
  const circ = outerCircle(center,circleParams.radius,{steps:circleParams.numberOfPoints,units:"meters"})
 
  //get the coordinates of the points from the circle
  const circPoints = circ.geometry.coordinates[0];
  //iterate over all points accept the last one (the last one is the first one to close the polygon)
  for (let i = 0; i < circPoints.length - 1; i++) {
    
    //we will project an imaginary line from the center to the point of the circle we 
    //created above
    
    const startPoint = center;
 
    const endPoint = point(circPoints[i]);
    endPoint.properties = {
        id: circleParams.locationId,
        bearing:undefined, 
        center:startPoint
      }
    //call the bearing function create the real bearing from the endpoint of the "line" to the center of the circle
    endPoint.properties.bearing = bearing(endPoint.geometry.coordinates,center.geometry.coordinates, {final:true})
    //push the altitude in the coordinates of the points
    endPoint.geometry.coordinates.push(circleParams.altitude);
    //add to the final collection array.=
    points.push(endPoint);
   
  }

  return featureCollection(points)
};
