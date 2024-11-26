import React, { useState, useRef } from 'react';
import DeckGL from '@deck.gl/react';
import { Tile3DLayer } from '@deck.gl/geo-layers';
import { GeoJsonLayer, LineLayer } from '@deck.gl/layers';
import { Box, Button, Slider, SliderTrack, SliderFilledTrack, SliderThumb, VStack, HStack, Text } from '@chakra-ui/react';
import { FirstPersonView, LinearInterpolator, MapView } from 'deck.gl';
import { ScenegraphLayer } from '@deck.gl/mesh-layers';


// -0.03889788363292723,
//           51.55753552515887
const defaultInitialViewState = {
    main: {
        longitude:  -0.03889788363292723,
        latitude:  51.55753552515887,
        zoom: 18,
        pitch: 45,
        bearing: 0,
    },
    drone: {
        longitude:  -0.03889788363292723,
        latitude:  51.55753552515887,
        pitch: 10,
        position: [0, 0, 50],
        bearing: 0,
    },
};

const MyDeckGLComponent = ({ initialViewState = defaultInitialViewState }) => {
    const [viewState, setViewState] = useState(initialViewState);
    const [locations, setLocations] = useState([]);
    const [circles, setCircles] = useState([]);
    const [hoveredDot, setHoveredDot] = useState(null);
    const [drawing, setDrawing] = useState(false);
    const deckRef = useRef(null);

    const calculateCircleCenter = (location) => {
        const { sourcePosition } = location;
        return {
            longitude: sourcePosition[0],
            latitude: sourcePosition[1],
            altitude: sourcePosition[2] + location.height
        };
    };

    const calculateBearingToCenter = (point, center) => {
        const dx = center.longitude - point.geometry.coordinates[0];
        const dy = center.latitude - point.geometry.coordinates[1];
        return (Math.atan2(dy, dx) * 180) / Math.PI;
    };

    const handleMapClick = async (event) => {
        if (!drawing || !deckRef.current) return;

        const picked = await deckRef.current.pickObject({
            x: event.x,
            y: event.y,
            unproject3D: true,
        });

        if (picked && picked.coordinate) {
            const [longitude, latitude, altitude = 0] = picked.coordinate;
            setLocations((prev) => [
                ...prev,
                {
                    id: Date.now(),
                    sourcePosition: [longitude, latitude, altitude],
                    targetPosition: [longitude, latitude, altitude + 60],
                    height: 60,
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
        const radius = 30;
        const numPoints = 16;
        const R = 6371000;

        const center = calculateCircleCenter(location);

        const circleGeoJSON = {
            type: 'FeatureCollection',
            features: Array.from({ length: numPoints }, (_, i) => {
                const angle = (2 * Math.PI * i) / numPoints;
                const offsetX = radius * Math.cos(angle);
                const offsetY = radius * Math.sin(angle);

                const deltaLon = (offsetX / R) / Math.cos((centerLat * Math.PI) / 180);
                const deltaLat = offsetY / R;

                const pointCoords = [
                    centerLon + (deltaLon * 180) / Math.PI,
                    centerLat + (deltaLat * 180) / Math.PI,
                    centerAlt + 5,
                ];

                return {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: pointCoords,
                    },
                    properties: {
                        id: `${location.id}-${i}`,
                        bearing: angle * (180 / Math.PI),
                        center: center
                    },
                };
            }),
        };

        setCircles((prev) => [...prev, circleGeoJSON]);
    };

    const layerFilter = ({ layer, viewport }) => {
        const viewId = viewport.id;
        if (viewId.startsWith('main')) {
            return layer.id.startsWith('main');
        } else if (viewId.startsWith('drone')) {
            return layer.id.startsWith('drone');
        }
        return false;
    };

    const handleViewStateChange = ({ viewId, viewState: updatedViewState }) => {
        setViewState((prev) => ({
            ...prev,
            [viewId]: updatedViewState,
        }));
    };

    const handleDotHover = (info) => {
        if (info.object) {
            const center = info.object.properties.center;
            const bearingToCenter = calculateBearingToCenter(info.object, center);

            setViewState((prev) => ({
                ...prev,
                drone: {
                    ...prev.drone,
                    longitude: info.object.geometry.coordinates[0],
                    latitude: info.object.geometry.coordinates[1],
                    position: [0, 0, info.object.geometry.coordinates[2]],
                    bearing: bearingToCenter +180 ,
                    pitch: 20,
                    transitionDuration: 100,
                    transitionInterpolator: new LinearInterpolator(['longitude', 'latitude', 'bearing', 'pitch']),
                },
            }));

            setHoveredDot({
                longitude: info.object.geometry.coordinates[0],
                latitude: info.object.geometry.coordinates[1],
                altitude: info.object.geometry.coordinates[2],
                centerPoint: center
            });
        } else {
            setHoveredDot(null);
        }
    };

    const layers = [
        new Tile3DLayer({
            id: 'main-google-3d-tiles',
            data: `https://tile.googleapis.com/v1/3dtiles/root.json`,
            pickable: true,
            opacity: 0.5,
            loadOptions: {
                fetch: {
                    headers: {
                        'X-GOOG-API-KEY': 'AIzaSyCwmX_Ejr4hEyGDZfgBWPgLYzIqMhY1P3M',
                    },
                },
            },
        }),

        new Tile3DLayer({
            id: 'drone-google-3d-tiles',
            data: `https://tile.googleapis.com/v1/3dtiles/root.json`,
            pickable: true,
            opacity: 1,
            loadOptions: {
                fetch: {
                    headers: {
                        'X-GOOG-API-KEY': 'AIzaSyCwmX_Ejr4hEyGDZfgBWPgLYzIqMhY1P3M',
                    },
                },
            },
        }),

        new LineLayer({
            id: 'main-line-layer',
            data: locations,
            getSourcePosition: (d) => d.sourcePosition,
            getTargetPosition: (d) => d.targetPosition,
            getColor: [0, 0, 255, 100],
            getWidth: 2,
        }),

        ...circles.map((circle, index) =>
            new GeoJsonLayer({
                id: `main-circle-${index}`,
                data: circle,
                pointType: 'circle',
                opacity: 0.1,
                getPointRadius: 5,
                getFillColor: [255, 0, 0, 0],
                pickable: true,
                onHover: handleDotHover,
            })
        ),

        ...circles.map((c, index) =>
            new ScenegraphLayer({
                id: `main-camera-${index}`,
                data: c.features,
                scenegraph: '/camera.glb',
                getTranslation: [0, 0, 2],
                getOrientation: d => [0, d.properties.bearing - 90, 90],
                getPosition: (d) => d.geometry.coordinates,
                getScale: [3, 3, 3],
                pickable: true,
            })
        ),
    ];

    return (
        <Box position="relative" width="100vw" height="100vh">
            <DeckGL
                ref={deckRef}
                viewState={viewState}
                //controller={true}
                views={[
                    new MapView({
                        id: 'main',
                        x: '0%',
                        y: '0%',
                        height: '100%',
                        width: '100%',
                        controller : true
                    }),
                    new FirstPersonView({
                        clear: true,
                        id: 'drone',
                        fovy : 35,
                        x: '70%',
                        y: '0%',
                        height: '300px',
                        width: '300px',
                        controller : true

                    }),
                ]}
                useDevicePixels={1}
                onViewStateChange={handleViewStateChange}
                onClick={handleMapClick}
                layerFilter={layerFilter}
                layers={layers}
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
                        <Text>Dot Position:</Text>
                        <Text>Longitude: {hoveredDot.longitude.toFixed(5)}</Text>
                        <Text>Latitude: {hoveredDot.latitude.toFixed(5)}</Text>
                        <Text>Altitude: {hoveredDot.altitude.toFixed(2)}m</Text>
                        <Text mt={2}>Center Point:</Text>
                        <Text>Longitude: {hoveredDot.centerPoint.longitude.toFixed(5)}</Text>
                        <Text>Latitude: {hoveredDot.centerPoint.latitude.toFixed(5)}</Text>
                        <Text>Altitude: {hoveredDot.centerPoint.altitude.toFixed(2)}m</Text>
                    </>
                ) : (
                    <Text>No dot hovered</Text>
                )}
            </Box>
        </Box>
    );
};

export default MyDeckGLComponent;
