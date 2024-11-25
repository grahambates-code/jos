import React, { useState, useRef } from 'react';
import DeckGL from '@deck.gl/react';
import { Tile3DLayer } from '@deck.gl/geo-layers';
import { GeoJsonLayer, LineLayer, IconLayer } from '@deck.gl/layers';
import { Box, Button, Slider, SliderTrack, SliderFilledTrack, SliderThumb, VStack, HStack, Text } from '@chakra-ui/react';
import { MapView } from 'deck.gl';

const defaultInitialViewState = {
    main: {
        longitude: -0.0834,
        latitude: 51.5132,
        zoom: 18,
        pitch: 45,
        bearing: 0,
    },
    drone: {
        longitude: -0.0834,
        latitude: 51.5132,
        zoom: 18,
        pitch: 45,
        bearing: 0,
    },
};

const arrowIcon = 'data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-arrow-up"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>';

const MyDeckGLComponent = ({ initialViewState = defaultInitialViewState }) => {
    const [viewState, setViewState] = useState(initialViewState);
    const [locations, setLocations] = useState([]);
    const [circles, setCircles] = useState([]);
    const [hoveredDot, setHoveredDot] = useState(null);
    const [drawing, setDrawing] = useState(false);
    const deckRef = useRef(null);

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
        const radius = 20;
        const numPoints = 4;

        const R = 6371000;

        const circleGeoJSON = {
            type: 'FeatureCollection',
            features: Array.from({ length: numPoints }, (_, i) => {
                const angle = (2 * Math.PI * i) / numPoints;
                const offsetX = radius * Math.cos(angle);
                const offsetY = radius * Math.sin(angle);

                const deltaLon = (offsetX / R) / Math.cos((centerLat * Math.PI) / 180);
                const deltaLat = offsetY / R;

                // Calculate bearing toward center
                const dx = -offsetX;
                const dy = -offsetY;
                const bearing = (Math.atan2(dy, dx) * 180) / Math.PI;

                return {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [
                            centerLon + (deltaLon * 180) / Math.PI,
                            centerLat + (deltaLat * 180) / Math.PI,
                            centerAlt + 5,
                        ],
                    },
                    properties: {
                        id: `${location.id}-${i}`,
                        bearing: bearing
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
        if (viewId === 'main') {
            setViewState((prev) => ({
                ...prev,
                main: updatedViewState,
            }));
        }
    };


    // First define your SVG arrow icon mapping
    const iconMapping = {
        arrow: {
            x: 0,
            y: 0,
            width: 32,
            height: 32,
            mask: true
        }
    };


    // Create SVG for arrow
    const arrowSvg = `
<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 2 L30 28 L16 22 L2 28 Z" fill="currentColor"/>
</svg>`;

    const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(arrowSvg)}`;


    return (
        <Box position="relative" width="100vw" height="100vh">
            <DeckGL
                ref={deckRef}
                viewState={viewState}
                controller={true}
                views={[
                    new MapView({
                        id: 'main',
                        x: '0%',
                        y: '0%',
                        height: '100%',
                        width: '100%',
                    }),
                    new MapView({
                        clear: true,
                        id: 'drone',
                        x: '60%',
                        y: '0%',
                        height: '40%',
                        width: '40%',
                    }),
                ]}
                useDevicePixels={1}
                onViewStateChange={({ viewId, viewState: updatedViewState }) =>
                    handleViewStateChange({ viewId, viewState: updatedViewState })
                }
                onClick={handleMapClick}
                layerFilter={layerFilter}
                layers={[
                    new Tile3DLayer({
                        id: 'main-google-3d-tiles',
                        data: `https://tile.googleapis.com/v1/3dtiles/root.json`,
                        pickable: true,
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
                        getColor: [0, 0, 255, 255],
                        getWidth: 2,
                        // parameters: {
                        //     depthTest: false,
                        // },
                    }),
                    ...circles.map((circle, index) =>
                        new GeoJsonLayer({
                            id: `main-circle-${index}`,
                            data: circle,
                            pointType: 'circle',
                            getPointRadius: 5,
                            getFillColor: [255, 0, 0, 150],
                            pickable: true,
                            // parameters: {
                            //     depthTest: false,
                            // },
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

                    ...circles.map((circle, index) =>
                        new GeoJsonLayer({
                            id: `main-bearing-${index}`,
                            data: circle,
                            pointType: 'icon',
                            iconAtlas: svgUrl,
                            billboard : true,
                            parameters: {
                                depthTest: false,
                            },
                            iconMapping: iconMapping,
                            getIcon: d => 'arrow',
                            getIconSize: 12,
                            getIconColor: [255, 255, 0, 150],
                            getIconAngle: d => {
                                console.log(d.properties.bearing)
                                return d.properties.bearing-90 || 0
                            },
                            pickable: true
                        })
                    )




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
