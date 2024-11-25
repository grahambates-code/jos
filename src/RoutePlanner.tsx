import React, { useState, useRef } from 'react';
import DeckGL from '@deck.gl/react';
import { Tile3DLayer } from '@deck.gl/geo-layers';
import { MaskExtension } from '@deck.gl/extensions';
import { GeoJsonLayer, LineLayer } from '@deck.gl/layers';
import { Box, Button, Slider, SliderTrack, SliderFilledTrack, SliderThumb, VStack, HStack, Text } from '@chakra-ui/react';

const defaultInitialViewState = {
    longitude: -0.0834, // Longitude of Leadenhall Market
    latitude: 51.5132,  // Latitude of Leadenhall Market
    zoom: 18.6,         // Closer zoom for better focus
    pitch: 45,
    bearing: 0,
};

const MyDeckGLComponent = ({ initialViewState = defaultInitialViewState }) => {
    const [viewState, setViewState] = useState(initialViewState);
    const [locations, setLocations] = useState([]); // Array of clicked locations
    const [circles, setCircles] = useState([]); // Array of GeoJSON circles
    const [hoveredDot, setHoveredDot] = useState(null); // Details of the hovered dot
    const [drawing, setDrawing] = useState(false);
    const deckRef = useRef(null); // Reference for the Deck instance

    const handleMapClick = async (event) => {
        if (!drawing || !deckRef.current) return;

        // Use pickObject to get the 3D coordinate
        const picked = await deckRef.current.pickObject({
            x: event.x,
            y: event.y,
            unproject3D: true, // Enable 3D unprojection to include altitude
        });

        if (picked && picked.coordinate) {
            const [longitude, latitude, altitude = 0] = picked.coordinate;

            // Add a new location to the array with default height
            setLocations((prev) => [
                ...prev,
                {
                    id: Date.now(), // Unique identifier
                    sourcePosition: [longitude, latitude, altitude],
                    targetPosition: [longitude, latitude, altitude + 40], // Default height
                    height: 40, // Default height
                },
            ]);
        }
    };

    const updateLocationHeight = (id, newHeight) => {
        setLocations((prev) =>
            prev.map((location) =>
                location.id === id
                    ? {
                        ...location,
                        targetPosition: [
                            location.sourcePosition[0],
                            location.sourcePosition[1],
                            location.sourcePosition[2] + newHeight,
                        ],
                        height: newHeight,
                    }
                    : location
            )
        );
    };

    const drawCircle = (location) => {
        const { targetPosition } = location;
        const [centerLon, centerLat, centerAlt] = targetPosition;
        const radius = 50; // Radius in meters
        const numPoints = 36; // Number of points in the circle

        const R = 6371000; // Earth radius in meters

        // Generate points on the circle
        const circleGeoJSON = {
            type: 'FeatureCollection',
            features: Array.from({ length: numPoints }, (_, i) => {
                const angle = (2 * Math.PI * i) / numPoints; // Angle in radians
                const offsetX = radius * Math.cos(angle); // Offset in meters (X-direction)
                const offsetY = radius * Math.sin(angle); // Offset in meters (Y-direction)

                // Convert offsets from meters to angular distances
                const deltaLon = (offsetX / R) / Math.cos((centerLat * Math.PI) / 180); // Adjust for latitude
                const deltaLat = offsetY / R;

                return {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [
                            centerLon + (deltaLon * 180) / Math.PI, // Convert to degrees
                            centerLat + (deltaLat * 180) / Math.PI, // Convert to degrees
                            centerAlt, // Altitude remains unchanged
                        ],
                    },
                    properties: {
                        id: `${location.id}-${i}`,
                    },
                };
            }),
        };

        setCircles((prev) => [...prev, circleGeoJSON]);
    };

    return (
        <Box position="relative" width="100vw" height="100vh">
            <DeckGL
                ref={deckRef} // Attach Deck instance
                viewState={viewState}
                controller={true}
                useDevicePixels={1}
                onViewStateChange={({ viewState }) => setViewState(viewState)}
                onClick={handleMapClick}
                layers={[
                    new Tile3DLayer({
                        id: 'google-3d-tiles1',
                        data: `https://tile.googleapis.com/v1/3dtiles/root.json`,
                        pickable: true, // Enable picking
                        extensions: [new MaskExtension()],
                        maskId: 'highlight-mask',
                        loadOptions: {
                            fetch: {
                                headers: {
                                    'X-GOOG-API-KEY': 'AIzaSyCwmX_Ejr4hEyGDZfgBWPgLYzIqMhY1P3M',
                                },
                            },
                        },
                    }),
                    new LineLayer({
                        id: 'line-layer',
                        data: locations, // Render all lines
                        getSourcePosition: (d) => d.sourcePosition,
                        getTargetPosition: (d) => d.targetPosition,
                        getColor: [0, 0, 255, 255],
                        getWidth: 2,
                    }),
                    ...circles.map((circle, index) =>
                        new GeoJsonLayer({
                            id: `circle-${index}`,
                            data: circle, // Render each circle
                            pointType: 'circle',
                            getPointRadius: 5,
                            getFillColor: [255, 0, 0, 150],
                            pickable: true,
                            onHover: (info) => {
                                if (info.object) {
                                    setHoveredDot({
                                        longitude: info.object.geometry.coordinates[0],
                                        latitude: info.object.geometry.coordinates[1],
                                        altitude: info.object.geometry.coordinates[2],
                                    });
                                } else {
                                    setHoveredDot(null);
                                }
                            },
                        })
                    ),
                ]}
                style={{ width: '100vw', height: '100vh' }}
            />
            <HStack
                position="absolute"
                top="10px"
                left="10px"
                spacing="10px"
                alignItems="flex-start"
            >
                <VStack spacing="10px">
                    <Button
                        colorScheme={drawing ? 'red' : 'blue'}
                        onClick={() => setDrawing(!drawing)}
                    >
                        {drawing ? 'Stop Drawing' : 'Click to Add Location'}
                    </Button>
                </VStack>
                <VStack
                    spacing="10px"
                    bg="white"
                    p="10px"
                    borderRadius="8px"
                    boxShadow="lg"
                    maxHeight="400px"
                    overflowY="auto"
                >
                    {locations.map((location) => (
                        <Box
                            key={location.id}
                            p="5px"
                            border="1px solid #ddd"
                            borderRadius="8px"
                            width="200px"
                        >
                            <Text>Longitude: {location.sourcePosition[0].toFixed(5)}</Text>
                            <Text>Latitude: {location.sourcePosition[1].toFixed(5)}</Text>
                            <Text>Height: {location.height}m</Text>
                            <Slider
                                defaultValue={location.height}
                                min={10}
                                max={200}
                                step={1}
                                onChange={(value) => updateLocationHeight(location.id, value)}
                            >
                                <SliderTrack>
                                    <SliderFilledTrack />
                                </SliderTrack>
                                <SliderThumb />
                            </Slider>
                            <Button
                                colorScheme="green"
                                size="sm"
                                mt="5px"
                                onClick={() => drawCircle(location)}
                            >
                                Draw Circle
                            </Button>
                        </Box>
                    ))}
                </VStack>
            </HStack>
            <Box
                position="absolute"
                top="10px"
                right="10px"
                bg="white"
                p="10px"
                borderRadius="8px"
                boxShadow="lg"
                minWidth="200px"
            >
                <Text fontWeight="bold">Hovered Dot Details</Text>
                {hoveredDot ? (
                    <>
                        <Text>Longitude: {hoveredDot.longitude.toFixed(5)}</Text>
                        <Text>Latitude: {hoveredDot.latitude.toFixed(5)}</Text>
                        <Text>Altitude: {hoveredDot.altitude.toFixed(2)}m</Text>
                    </>
                ) : (
                    <Text>No dot hovered</Text>
                )}
            </Box>
        </Box>
    );
};

export default MyDeckGLComponent;
