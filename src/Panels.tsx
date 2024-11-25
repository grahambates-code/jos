import  { useRef, useEffect, useState } from "react";
import { Box, Card, Text, Badge, Slider, SliderTrack, SliderFilledTrack, SliderThumb, VStack, HStack, Heading } from "@chakra-ui/react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import TextEditor from "./TextEditor.tsx";
import Map from "./Map.tsx";

gsap.registerPlugin(ScrollTrigger);

const Pattern = ({ color1, color2, currentPanel, viewState, setViewState }) => (
    <Box
        width="100%"
        height="100%"
        position="relative"
        bg={color1}
        display="flex"
        alignItems="center"
        justifyContent="center"
    >
        {/* Pattern Overlay */}
        <Box
            position="absolute"
            inset="0"
            opacity={0.3}
            style={{
                backgroundImage: `linear-gradient(45deg, ${color2} 25%, transparent 25%, transparent 75%, ${color2} 75%, ${color2}), 
                         linear-gradient(45deg, ${color2} 25%, transparent 25%, transparent 75%, ${color2} 75%, ${color2})`,
                backgroundSize: "60px 60px",
                backgroundPosition: "0 0, 30px 30px",
            }}
        >

        </Box>

        <Map viewState={viewState} setViewState={setViewState} />

        {/* Current Panel Display */}
        <Box position="absolute" top="20px" left="20px" zIndex={99999999}>
            <Badge colorScheme="yellow" fontSize="2xl" padding="4">
                Current Panel: {currentPanel}
            </Badge>
        </Box>
        <Text color="white" fontSize="8xl" fontWeight="bold">
          Front face

        </Text>

    </Box>
);

const content = [
    {
        colors: { bg: "#2D3748", pattern: "#4A5568" },
        panels: [
            "Deep in the ancient forest, sunlight filters through the dense canopy.",
            "The old growth trees have stood here for centuries, witnessing time.",
            "A gentle stream winds its way through the mossy forest floor.",
        ],
    },
    {
        colors: { bg: "#2B6CB0", pattern: "#4299E1" },
        panels: [
            "The mountain peak pierces through the morning clouds.",
            "Snow-capped ridges extend as far as the eye can see.",
            "Alpine flowers dot the rocky landscape in surprising bursts of color.",
        ],
    },
];

const ControlPanel = ({ fadeSettings, setFadeSettings }) => {
    return (
        <Box
            position="fixed"
            top="0"
            width="100%"
            zIndex={100}
            bg="white"
            boxShadow="md"
            padding={4}
        >
            <Heading size="sm" mb={2}>
                Control Panel
            </Heading>
            <VStack spacing={4} align="start">
                <HStack spacing={4}>
                    <Text>Fade Start Threshold: {fadeSettings.start}%</Text>
                    <Slider
                        min={0}
                        max={100}
                        step={1}
                        value={fadeSettings.start}
                        onChange={(value) => setFadeSettings((prev) => ({ ...prev, start: value }))}
                    >
                        <SliderTrack>
                            <SliderFilledTrack />
                        </SliderTrack>
                        <SliderThumb />
                    </Slider>
                </HStack>
                <HStack spacing={4}>
                    <Text>Fade End Threshold: {fadeSettings.end}%</Text>
                    <Slider
                        min={0}
                        max={100}
                        step={1}
                        value={fadeSettings.end}
                        onChange={(value) => setFadeSettings((prev) => ({ ...prev, end: value }))}
                    >
                        <SliderTrack>
                            <SliderFilledTrack />
                        </SliderTrack>
                        <SliderThumb />
                    </Slider>
                </HStack>
                <HStack spacing={4}>
                    <Text>Opacity: {fadeSettings.opacity}</Text>
                    <Slider
                        min={0}
                        max={1}
                        step={0.1}
                        value={fadeSettings.opacity}
                        onChange={(value) => setFadeSettings((prev) => ({ ...prev, opacity: value }))}
                    >
                        <SliderTrack>
                            <SliderFilledTrack />
                        </SliderTrack>
                        <SliderThumb />
                    </Slider>
                </HStack>
            </VStack>
        </Box>
    );
};

const Section = ({ section, index, setGlobalCurrentPanel, fadeSettings }) => {
    const panelsRef = useRef([]);
    const [currentPanel, setCurrentPanel] = useState(1);
const [viewState, setViewState] = useState({
        longitude: -0.0834, // Longitude of Leadenhall Market
        latitude: 51.5132,  // Latitude of Leadenhall Market
        zoom: 18.6,           // Closer zoom for better focus
        pitch: 45,
        bearing: 0,
});
    useEffect(() => {
        panelsRef.current.forEach((panel, i) => {
            if (panel) {
                gsap.timeline({
                    scrollTrigger: {
                        trigger: panel,
                        start: `top ${fadeSettings.start}%`,
                        end: `top ${fadeSettings.end}%`,
                        scrub: true,
                        onEnter: () => {
                            setCurrentPanel(i + 1);
                            setGlobalCurrentPanel({ sectionIndex: index, panelIndex: i + 1 });
                        },
                        onEnterBack: () => {
                            setCurrentPanel(i + 1);
                        },
                    },
                });

                gsap.to(panel, {
                    opacity: fadeSettings.opacity,
                    scrollTrigger: {
                        trigger: panel,
                        start: `top ${fadeSettings.start}%`,
                        end: `top ${fadeSettings.end}%`,
                        scrub: true,
                    },
                });
            }
        });

        return () => {
            ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
        };
    }, [index, setGlobalCurrentPanel, fadeSettings]);

    return (
        <Box
            position="relative"
            height={`${110 * section.panels.length + 100}vh`}
        >
            <Box position="sticky" top={0} left={0} width="100vw" height="100vh" zIndex={1}>
                <Pattern
                    color1={section.colors.bg}
                    color2={section.colors.pattern}

                    currentPanel={currentPanel}
                    viewState={viewState}
                    setViewState={setViewState}
                />
            </Box>

            <Box position="relative" top={0} right={0} width="100%" zIndex={2}>
                {section.panels.map((panel, panelIndex) => (
                    <Box
                        key={panelIndex}
                        ref={(el) => (panelsRef.current[panelIndex] = el)}
                        data-index={panelIndex}
                        height="110vh"
                        display="flex"
                        alignItems="center"
                        justifyContent="flex-end"
                        paddingRight="2vw"
                    >
                        <Card
                            width="40vw"
                            height="90%"
                            bg="white"
                            boxShadow="lg"
                            borderRadius="md"
                        >


                            <TextEditor viewState={viewState} setViewState={setViewState} report={{}} />

                        </Card>
                    </Box>
                ))}
            </Box>
        </Box>
    );
};

const ScrollStory = () => {
    const [globalCurrentPanel, setGlobalCurrentPanel] = useState({
        sectionIndex: 0,
        panelIndex: 1,
    });

    const [fadeSettings, setFadeSettings] = useState({
        start: 80, // Default start threshold
        end: 40, // Default end threshold
        opacity: 1, // Default opacity
    });

    return (
        <Box>
            {content.map((section, index) => (
                <Section
                    key={index}
                    section={section}
                    index={index}
                    setGlobalCurrentPanel={setGlobalCurrentPanel}
                    fadeSettings={fadeSettings}
                />
            ))}
        </Box>
    );
};

export default ScrollStory;
