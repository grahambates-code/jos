import React, { useState } from 'react';
import DeckGL from '@deck.gl/react';
import { Tile3DLayer } from '@deck.gl/geo-layers';
import { MaskExtension } from '@deck.gl/extensions';
import { GeoJsonLayer, MapView } from 'deck.gl';

// GeoJSON for Leadenhall Market's approximate location
const data = {
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "properties": {},
            "geometry": {
                "coordinates": [
                    [
                        [
                            -0.08353910491436523,
                            51.51291108248893
                        ],
                        [
                            -0.08427510062392685,
                            51.51302755348016
                        ],
                        [
                            -0.08433799201142733,
                            51.512892258438484
                        ],
                        [
                            -0.08436105657451165,
                            51.512870211955345
                        ],
                        [
                            -0.08417550543749286,
                            51.5128433569669
                        ],
                        [
                            -0.08397052307326192,
                            51.51280888101908
                        ],
                        [
                            -0.0835760113598667,
                            51.512747141900974
                        ],
                        [
                            -0.0836498242522623,
                            51.51257174669058
                        ],
                        [
                            -0.08352232925722092,
                            51.51255086626347
                        ],
                        [
                            -0.08344683879923309,
                            51.512725217536314
                        ],
                        [
                            -0.08339315669655889,
                            51.51274400984943
                        ],
                        [
                            -0.08334822445212353,
                            51.51288384721573
                        ],
                        [
                            -0.08343304073608238,
                            51.51289686378533
                        ],
                        [
                            -0.08353910491436523,
                            51.51291108248893
                        ]
                    ]
                ],
                "type": "Polygon"
            }
        }
    ]
};

// React component with Deck.GL and useState for viewState
const MyDeckGLComponent = ({viewState, setViewState}) => {
    // const [viewState, setViewState] = useState({
    //     longitude: -0.0834, // Longitude of Leadenhall Market
    //     latitude: 51.5132,  // Latitude of Leadenhall Market
    //     zoom: 18.6,           // Closer zoom for better focus
    //     pitch: 45,
    //     bearing: 0,
    // });

    return (
        <DeckGL
            initialViewState={viewState}
            controller={false}
            onViewStateChange={({ viewState }) => setViewState(viewState)}
            layers={[
                new Tile3DLayer({
                    id: 'google-3d-tiles1',
                    data: `https://tile.googleapis.com/v1/3dtiles/root.json`,
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

                // new Tile3DLayer({
                //     id: 'google-3d-tiles2',
                //     data: `https://tile.googleapis.com/v1/3dtiles/root.json`,
                //     opacity: 0.001,
                //     maskInverted: true,
                //     parameters: {
                //         depthTest: true,
                //     },
                //     extensions: [new MaskExtension()],
                //     maskId: 'highlight-mask',
                //     pickable: false,
                //     loadOptions: {
                //         fetch: {
                //             headers: {
                //                 'X-GOOG-API-KEY': 'AIzaSyCwmX_Ejr4hEyGDZfgBWPgLYzIqMhY1P3M',
                //             },
                //         },
                //     },
                // }),

                new GeoJsonLayer({
                    id: 'highlight-mask',
                    data: data,
                    operation: 'mask',
                    stroked: true,
                    getFillColor: [255, 215, 0, 150], // Highlight with gold color
                    getLineColor: [255, 140, 0],     // Bold orange outline
                    lineWidthMinPixels: 2,
                }),
            ]}
            style={{ width: '100vw', height: '100vh' }}
        />
    );
};

export default MyDeckGLComponent;
