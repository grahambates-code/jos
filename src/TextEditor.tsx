import React, { useState, useRef, useEffect } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Mark, mergeAttributes } from '@tiptap/core';
import { Box, HStack, Button, VStack, Text } from '@chakra-ui/react';
import { LinearInterpolator } from 'deck.gl';
import { debounce } from 'lodash';
import { easeCubicInOut, easeCubicOut, easeCubicIn } from 'd3-ease';
import './TextEditor.css';



// Custom Interpolator class
class EasedLinearInterpolator extends LinearInterpolator {
  constructor(transitionProps) {
    super(transitionProps);
  }

  easing(t) {
    return easeCubicOut(t);
  }
}

function calculateDistance(start, end) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  return Math.sqrt(dx * dx + dy * dy);
}

function getDynamicDuration(startTarget, endTarget) {
  const distance = calculateDistance(startTarget, endTarget);
  const minDuration = 500; // Minimum duration in milliseconds
  const maxDuration = 1500; // Maximum duration in milliseconds

  // Define a distance range to scale the duration
  const maxDistance = 1000; // Max distance that corresponds to maxDuration

  // Calculate duration proportional to distance
  let duration = (distance / maxDistance) * maxDuration;

  // Clamp duration to be between minDuration and maxDuration
  duration = Math.max(minDuration, Math.min(duration, maxDuration));

  return duration;
}

// Custom Mark extension to capture viewState
const ViewStateMark = Mark.create({
  name: 'viewStateMark',

  addOptions() {
    return {
      HTMLAttributes: {}
    };
  },

  addAttributes() {
    return {
      viewState: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-viewState'),
        renderHTML: (attributes) => {
          if (!attributes.viewState) {
            return {};
          }
          return {
            'data-viewState': attributes.viewState,
            class: 'viewState-mark'
          };
        }
      }
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-viewState]'
      }
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setViewStateMark:
        (viewState) =>
        ({ commands }) => {
          return commands.setMark(this.name, { viewState: JSON.stringify(viewState) });
        },
      removeViewStateMark:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        }
    };
  }
});

// Tooltip component
const Tooltip = ({ content, position, onRemove, onGoToViewState }) => {
  if (!position) return null;

  return (
    <Box
      position="absolute"
      left={position.x}
      top={position.y}
      transform="translateY(-105%)"
      padding="5px"
      borderRadius="md"
      zIndex={1000}
    >
      <HStack mt={2}>
        <Button size="sm" colorScheme="red" onClick={onRemove}>
          Remove
        </Button>
      </HStack>
    </Box>
  );
};

// Main Editor with Tooltips
const EditorWithTooltips = ({ report, editor, viewState, setViewState }) => {
  const [tooltipData, setTooltipData] = useState(null);
  const contentRef = useRef(null);
  const timeoutRef = useRef(null);
  const currentMarkRef = useRef(null);
  const [isMoving, setIsMoving] = useState(false);

  const handleGoToViewState = (mark) => {
    if (isMoving) return; // Prevent further updates if already moving

    const viewStateData = mark.getAttribute('data-viewState');
    const parsedViewState = JSON.parse(viewStateData);

    const id = report.id;
    if (true) {
      setIsMoving(true); // Mark as moving

      setViewState({
        [id]: {
          ...viewState.leftView,
          transitionInterpolator: new EasedLinearInterpolator({
            transitionProps: ['target', 'zoom', 'rotationX', 'rotationOrbit']
          }),
          transitionDuration: 1200,
          target: parsedViewState.target,
          zoom: parsedViewState.zoom,
          rotationX: parsedViewState.rotationX,
          rotationOrbit: parsedViewState.rotationOrbit
        }
      });
    }
  };

  const showTooltip = (mark, event) => {
    // Trigger the "Go to ViewState" on hover
    handleGoToViewState(mark);

    if (event.type === 'click') {
      const viewState = mark.getAttribute('data-viewState');
      const editorRect = contentRef.current.getBoundingClientRect();

      let startPos = null;
      editor.state.doc.descendants((node, pos) => {
        if (startPos !== null) return false;
        if (
          node.marks.find((m) => m.type.name === 'viewStateMark' && m.attrs.viewState === viewState)
        ) {
          startPos = pos;
          return false;
        }
      });

      if (startPos === null) return;

      const startCoords = editor.view.coordsAtPos(startPos);

      setTooltipData({
        content: `Captured ViewState: ${JSON.parse(viewState).target}`,
        position: {
          x: startCoords.left - editorRect.left,
          y: startCoords.top - editorRect.top
        },
        viewState: JSON.parse(viewState) // Save viewState for later use
      });
      currentMarkRef.current = mark;
    }
  };

  const hideTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      setTooltipData(null);
      currentMarkRef.current = null;
    }, 200);
  };

  useEffect(() => {
    const handleMouseMove = debounce((e) => {
      const mark = e.target.closest('.viewState-mark');

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      if (mark && currentMarkRef.current !== mark) {
        showTooltip(mark, e);
      } else if (!mark) {
        hideTooltip();
      }
    }, 50); // Adjust the debounce delay as n

    const handleClick = (e) => {
      const mark = e.target.closest('.viewState-mark');

      if (mark) {
        showTooltip(mark, e);
      }
    };

    const currentRef = contentRef.current;
    if (currentRef) {
      currentRef.addEventListener('mousemove', handleMouseMove);
      currentRef.addEventListener('click', handleClick);
    }

    return () => {
      if (currentRef) {
        currentRef.removeEventListener('mousemove', handleMouseMove);
        currentRef.removeEventListener('click', handleClick);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [editor]);

  const handleRemoveMark = () => {
    if (editor && currentMarkRef.current) {
      const pos = editor.view.posAtDOM(currentMarkRef.current, 0);
      editor
        .chain()
        .focus()
        .setTextSelection({ from: pos, to: pos + currentMarkRef.current.textContent.length })
        .unsetMark('viewStateMark')
        .run();
      setTooltipData(null);
      currentMarkRef.current = null;
    }
  };

  return (
    <div style={{ position: 'relative', height: '100%' }}>
      <div ref={contentRef} className={'Editor'}>
        <EditorContent editor={editor} />
      </div>
      {tooltipData && (
        <Tooltip
          {...tooltipData}
          onRemove={handleRemoveMark}
          onGoToViewState={() => handleGoToViewState(currentMarkRef.current)}
        />
      )}
    </div>
  );
};

// Main Editor Component
const TiptapEditor = ({ report, viewState, setViewState }) => {
  const [isTextSelected, setIsTextSelected] = useState(false);

  const editor = useEditor({
    extensions: [StarterKit, ViewStateMark],
    content: '<p>Select some text and press the button to capture the viewState.</p>'
  });

  if (!editor) {
    return null;
  }

  useEffect(() => {
    if (!editor) return;

    const updateSelection = () => {
      const { empty } = editor.state.selection;
      setIsTextSelected(!empty); // If the selection is not empty, text is selected
    };

    editor.on('selectionUpdate', updateSelection);

    // Cleanup event listener on unmount
    return () => {
      editor.off('selectionUpdate', updateSelection);
    };
  }, [editor]);

  const handleMakeMark = () => {
    editor.chain().focus().setViewStateMark(viewState).run();

    // Unselect the text by setting the selection to the same position
    const { from } = editor.state.selection;
    editor.commands.setTextSelection({ from, to: from });

    // Update the state to reflect that no text is selected
    setIsTextSelected(false);
  };

  return (
    <VStack align="start">
      <Box
        border="1px solid #E2E8F0"
        w="100%"
        h="100%"
        bg={'whiteAlpha.700'}
        position="absolute"
        className="editor-container"
      >
        <EditorWithTooltips
          report={report}
          viewState={viewState}
          editor={editor}
          setViewState={setViewState}
        />

        {isTextSelected && (
          <Button onClick={handleMakeMark} mb={2} width={'100%'}>
            Record Position
          </Button>
        )}
      </Box>
    </VStack>
  );
};

export default TiptapEditor;
