import   { useState } from "react";
import { Box } from "@chakra-ui/react";
import Map from "./Map";
import Editor from "./TextEditor";

const MapAndEditor = () => {
    const [viewState, setViewState] = useState({
        longitude: -122.45,
        latitude: 37.78,
        zoom: 12,
        pitch: 30,
        bearing: 0
    });

    return (
        <Box>
            {/* Map Component */}
            <Map viewState={viewState} setViewState={setViewState} />

            {/* Editor Component */}
            <Editor report={{}} viewState={viewState} setViewState={setViewState} />
        </Box>
    );
};

export default MapAndEditor;
