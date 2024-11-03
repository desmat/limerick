'use client'

import moment from "moment";
import { useEffect, useRef, useState } from "react";
import { FaMagic } from "react-icons/fa";
import { TbReload } from "react-icons/tb";
import { useDebouncedCallback } from "use-debounce";
import { ExperienceMode } from "@/types/ExperienceMode";
import { Haiku } from "@/types/Haiku";
import { defaultPresetLayout, presetLayouts } from "@/types/Layout";
import { USAGE_LIMIT } from "@/types/Usage";
import { User } from "@/types/User";
import { capitalize, upperCaseFirstLetter } from "@/utils/format";
import delay from "@/utils/delay";
import trackEvent from "@/utils/trackEvent";
import PopOnClick from "./PopOnClick";
import { StyledLayers } from "./StyledLayers";
import { GenerateIcon } from "./nav/GenerateInput";

const formatHaikuTitleAndAuthor = (haiku: Haiku, mode?: string) => {
  return [
    `"${capitalize(haiku.theme)}", `,
    `limericks.ai/${haiku.id}`
  ];
}

export const formatHaikuText = (haiku: Haiku, mode?: string) => {
  const haikuTitleAndAuthor = formatHaikuTitleAndAuthor(haiku, mode);

  return haiku?.poem
    .map((value: string, i: number) => upperCaseFirstLetter(value))
    .join("\n")
    + `\n—${haikuTitleAndAuthor.join("")}\n`;
};

export default function HaikuPoem({
  user,
  mode,
  haiku,
  popPoem,
  styles,
  altStyles,
  fontSize,
  padding,
  onboardingElement,
  regeneratePoem,
  regenerateImage,
  saveHaiku,
  copyHaiku,
  switchMode,
  regenerating,
  updateLayout,
}: {
  user?: User,
  mode: ExperienceMode,
  haiku: Haiku,
  popPoem?: boolean,
  styles: any[],
  altStyles?: any[],
  fontSize?: string | undefined,
  padding?: string | undefined,
  onboardingElement?: string,
  regeneratePoem?: any,
  regenerateImage?: any,
  saveHaiku?: any,
  copyHaiku?: any,
  switchMode?: any,
  regenerating?: boolean,
  updateLayout?: any,
}) {
  // console.log('>> app._components.HaikuPoem.render()', { mode, haikuId: haiku?.id, status: haiku?.status, popPoem, haiku, padding });
  const showcaseMode = mode == "showcase";
  const onboarding = typeof (onboardingElement) == "string"
  const dateCode = moment().format("YYYYMMDD");
  const layout = haiku?.layout?.custom || presetLayouts[defaultPresetLayout];

  const [_saving, setSaving] = useState(false);
  const saving = _saving || regenerating;
  const switchModeAllowed = !!switchMode;
  const canSwitchMode = switchModeAllowed && !saving && process.env.EXPERIENCE_MODE != "haikudle";
  const copyAllowed = !!copyHaiku && !switchModeAllowed;
  const canCopy = copyAllowed && !saving;

  const editAllowed = haiku?.createdBy == user?.id || user?.isAdmin || haiku?.isDemo;
  const canEdit = editAllowed && !showcaseMode;
  let [editing, setEditing] = useState(false);
  const [lastVersion, setLastVersion] = useState<number | undefined>(haiku?.version);

  const updateLayoutAllowed = !!updateLayout && (user?.isAdmin || haiku?.createdBy && haiku?.createdBy == user?.id);
  const canUpdateLayout = updateLayoutAllowed && !saving && process.env.EXPERIENCE_MODE != "haikudle";

  const regeneratePoemAllowed = regeneratePoem && (user?.isAdmin || haiku?.createdBy == user?.id) && regeneratePoem;
  const regenerateImageAllowed = regenerateImage && (user?.isAdmin || haiku?.createdBy == user?.id) && regenerateImage;
  const canRegeneratePoem = regeneratePoemAllowed && !saving;
  const canRegenerateImage = regenerateImageAllowed && !saving;
  // console.log('>> app._components.HaikuPage.HaikuPoem.render()', { showcaseMode, canCopy, canSwitchMode });

  let [displayPoem, setDisplayPoem] = useState<string[][]>(haiku && haiku.poem.map((line: string) => line.split(/\s+/).map((word: string) => word)));
  let [editPoem, setEditPoem] = useState<string[][]>(haiku && haiku.poem.map((line: string) => line.split(/\s+/).map((word: string) => word)));
  let [currentPoem, setCurrentPoem] = useState<string[][]>(haiku && haiku.poem.map((line: string) => line.split(/\s+/).map((word: string) => word)));
  let [lastPoem, setLastPoem] = useState<string[][]>();
  let refs = [
    [useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(),],
    [useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(),],
    [useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(),],
    [useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(),],
    [useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(),],
  ]
  const longPressTimerRef = useRef();
  let [killingWords, setKillingWords] = useState(false);
  let [mouseDown, setMouseDown] = useState(false);
  let [firstWordPointerEnter, setFirstWordPointerEnter] = useState<number[]>();

  const loopAnimation = false;
  const animationStepPauses = [2000, 5, 5, 0, 0, 2000]; // first step is blank, last is pause at end
  const [animating, setAnimating] = useState(true);
  let [animationStep, setAnimationStep] = useState(0);
  let [animationWord, setAnimationWord] = useState(0);

  const handleLongPressHaiku = (e: any) => {
    // console.log('>> app._components.HaikuPoem.handleLongPressHaiku()', { mode, haikuId: haiku?.id, status: haiku?.status, popPoem, haiku });

    // TODO

    // e.preventDefault();
    setEditing(true);

    longPressTimerRef.current = undefined;
  }

  const handleClickHaiku = (e: any) => {
    // console.log('>> app._components.HaikuPoem.handleClickHaiku()', { longPressTimerRef });
    if (longPressTimerRef.current) {
      return handleLongPressHaiku(e);
    }

    // return;

    console.log('>> app._components.HaikuPoem.handleClickHaiku()', { mode, haikuId: haiku?.id, status: haiku?.status, popPoem, haiku });

    if (editing) return;

    // if (showcaseMode && canRefresh) {
    //   return refresh(e);
    // }

    if (canCopy) {
      trackEvent("haiku-copied", {
        userId: user?.id,
        id: haiku?.id,
        location: "haiku-poem",
      });

      return copyHaiku();
    }

    if (canSwitchMode) {
      trackEvent("switched-mode", {
        userId: user?.id,
        id: haiku?.id,
      });

      return switchMode(showcaseMode ? "" : "showcase");
    }
  }

  const debouncedSave = useDebouncedCallback(
    () => {
      setLastPoem(haiku && haiku.poem.map((line: string) => line.split(/\s+/).map((word: string) => word)));
      // join the words then consolidate the possible "... ..." repetition
      const updatePoemRequest = editPoem.map((line: string[]) => line.join(" ").replaceAll(/(\.\.\.\s?)+/g, "..."));
      setSaving(true);

      saveHaiku({
        ...haiku,
        poem: updatePoemRequest,
      }).then((haiku: Haiku) => {
        setDisplayPoem(haiku && haiku.poem.map((line: string) => line.split(/\s+/).map((word: string) => word)));
        setEditPoem(haiku && haiku.poem.map((line: string) => line.split(/\s+/).map((word: string) => word)));
        setCurrentPoem(haiku && haiku.poem.map((line: string) => line.split(/\s+/).map((word: string) => word)));
        setSaving(false);
      });
    },
    2000
  );

  // console.log(">> app._component.HaikuPoem render", { displayPoem, editPoem });

  const debouncedSetPoemStates = useDebouncedCallback(
    () => {
      setDisplayPoem(displayPoem.map((line: string[]) => [...line]));
      setEditPoem(editPoem.map((line: string[]) => [...line]));
    },
    10
  )

  const killWords = async (words: any[]) => {
    // console.log(">> app._component.HaikuPoem.killWords", { words });

    if (!saving) { //!savingLine[lineNum]) {
      let someToKill = false;
      words.forEach((word: any) => {
        const [lineNum, wordNum] = word;
        if (displayPoem[lineNum][wordNum]) {
          displayPoem[lineNum][wordNum] = "";
          editPoem[lineNum][wordNum] = "...";
          someToKill = true;
        }
      })

      if (someToKill) {
        debouncedSetPoemStates();
      }

      debouncedSave();
    }
    // console.log(">> app._component.HaikuPoem.killWords", { displayPoem });
  };

  const handleMouseDownWord = async (e: any, lineNum: number, wordNum: number) => {
    if (!canEdit) return;

    // @ts-ignore
    longPressTimerRef.current = setTimeout(() => {
      handlePointerEnterWord(e, lineNum, wordNum);
    }, 250);

    if (!editing) return;
    // console.log(">> app._component.HaikuPoem.handleMouseDownWord", { e, lineNum, wordNum });

    mouseDown = true;
    setMouseDown(mouseDown);

    // start killing right away
    handleMouseMoveWord(e, lineNum, wordNum);
  };

  const handleMouseUp = async (e: any, lineNum?: number, wordNum?: number) => {
    longPressTimerRef.current && clearTimeout(longPressTimerRef.current)
    longPressTimerRef.current = undefined;

    if (!editing) return;
    // console.log(">> app._component.HaikuPoem.handleMouseUp", { e });

    mouseDown = false;
    setMouseDown(mouseDown);
    killingWords = false;
    setKillingWords(killingWords);

    // TODO either bring this back or allow single-tap for showcase mode
    // if (typeof (lineNum) == "number" && typeof (wordNum) == "number") {
    //   killWords([[lineNum, wordNum]]);
    // }
  };

  const handleMouseMoveWord = async (e: any, lineNum: number, wordNum: number) => {
    if (!editing) return;
    // console.log(">> app._component.HaikuPoem.handleMouseMoveWord", { e, lineNum, wordNum });

    if (mouseDown) {
      if (!killingWords) {
        killingWords = true;
        setKillingWords(killingWords);
      }

      killWords([[lineNum, wordNum]]);
    }
  };

  let [refBoundingClientRects, setRefBoundingClientRects] = useState<any[][]>();
  let [lastTouchXY, setLastTouchXY] = useState<[number, number]>();

  const debouncedSetLastTouchXY = useDebouncedCallback(
    () => {
      setLastTouchXY(lastTouchXY);
    },
    100
  )

  const handlePointerEnterWord = async (e: any, lineNum: number, wordNum: number) => {
    // console.log(">> app._component.HaikuPoem.handlePointerEnterWord", { quickEditing, mouseDown, killingWords });
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = undefined;

      editing = true;
      setEditing(editing);
      handleMouseDownWord(e, lineNum, wordNum);
    }

    if (!editing) return;

    // console.log(">> app._component.HaikuPoem.handlePointerEnterWord", { e, lineNum, wordNum });

    refBoundingClientRects = refs
      .map((line: any[]) => line
        .map((ref: any) => ref?.current && ref.current.getBoundingClientRect()).filter(Boolean)
      );
    setRefBoundingClientRects(refBoundingClientRects);
    firstWordPointerEnter = [lineNum, wordNum];
    setFirstWordPointerEnter(firstWordPointerEnter);
    // console.log(">> app._component.HaikuPoem.handlePointerEnterWord", { refBoundingClientRects, firstWordPointerEnter });

    lastTouchXY = [e.clientX, e.clientY];
    // setLastTouchXY(lastTouchXY);
    debouncedSetLastTouchXY();
  }

  const findMovedOver = (e: any) => {
    // var touch = e.originalEvent?.touches && e.originalEvent?.touches[0] || e.originalEvent?.changedTouches && e.originalEvent?.changedTouches[0];
    const touch = e.touches[0];
    const touchX = touch.pageX;
    const touchY = touch.pageY;

    const lastTouchX = lastTouchXY && lastTouchXY.length >= 1 && lastTouchXY[0] || touchX;
    const lastTouchY = lastTouchXY && lastTouchXY.length >= 2 && lastTouchXY[1] || touchY;

    lastTouchXY = [touchX, touchY];
    debouncedSetLastTouchXY();
    // setLastTouchXY(lastTouchXY);

    // console.log(">> app._component.HaikuPoem.findMovedOver", { touchX, touchY, lastTouchX, lastTouchY, refBoundingClientRects });

    const overWords = refBoundingClientRects && refBoundingClientRects
      .map((line: any[], i: number) => line
        .map((rects: any, j: number) => {
          const { x, y, width, height } = rects;

          if (touchX >= x && lastTouchX <= x + width
            && touchY >= y && lastTouchY <= y + height
          ) {
            return [i, j]
          }
        }))
      .flat()
      .filter(Boolean);

    const overWord = overWords && overWords[0];
    // console.log("app._component.HaikuPoem.findMovedOver", { x: touchX, y: touchY, overWord, overWords });

    if (overWord && overWord.length >= 2 && displayPoem[overWord[0]][overWord[1]]) {
      killWords(overWords);
      // debouncedKillWords(overWords);
    }
  }

  const debouncedTouchMoved = useDebouncedCallback(
    (e: any) => {
      // make sure the first move kills the first word right away
      if (firstWordPointerEnter) {
        killWords([firstWordPointerEnter])
        firstWordPointerEnter = undefined;
        setFirstWordPointerEnter(firstWordPointerEnter);
      }

      findMovedOver(e);
    },
    1
  );

  const handleTouchMove = async (e: any) => {
    // console.log("app._component.HaikuPoem.handleTouchMove", { quickEditing, mouseDown, killingWords });
    if (!editing) return;
    // console.log("app._component.HaikuPoem.handleTouchMove", { e });
    debouncedTouchMoved(e);
    // findMovedOver(e);

    if (!killingWords) {
      killingWords = true;
      setKillingWords(killingWords);
    }
  }

  const PoemButtons = () => {
    return (
      <div
        className="poem-buttons onboarding-container group/actions _bg-yellow-200 flex flex-row md:gap-3 gap-[0.5rem]"
        onClick={(e: any) => e.preventDefault()}
      >
        {onboardingElement && ["poem-actions"].includes(onboardingElement) &&
          <div className="onboarding-focus" />
        }
        {onboardingElement && ["poem-and-poem-actions"].includes(onboardingElement) &&
          <div className="onboarding-focus double" />
        }
        {editAllowed &&
          <div
            className={`${!saving ? "cursor-pointer" : "cursor-default"} md:mt-[0.05rem] mt-[0.03rem]`}
            title="Edit this haiku"
            onClick={(e: any) => {
              e.preventDefault();
              if (canEdit) {
                setEditing(!editing);
              }
            }}
          >
            <StyledLayers styles={altStyles || []}>
              <PopOnClick>
                <FaMagic className={`
                  h-4 w-4 md:h-5 md:w-5 
                  ${editing ? "animate-pulse" : ""}
                  ${saving || !canEdit
                    ? "opacity-60"
                    : canEdit
                      ? "opacity-100"
                      : ""
                  }
                `} />
              </PopOnClick>
            </StyledLayers>
          </div>
        }
        {regeneratePoemAllowed &&
          <div className="_bg-pink-200 md:mt-[-0.02rem] mt-[0]">
            {!user?.isAdmin && (user?.usage[dateCode]?.haikusRegenerated || 0) >= USAGE_LIMIT.DAILY_REGENERATE_HAIKU &&
              <span title="Exceeded daily limit: try again later">
                <StyledLayers styles={altStyles || []}>
                  <GenerateIcon sizeOverwrite={`
                    h-[1.1rem] w-[1.1rem] md:h-6 md:w-6
                    ${onboardingElement == "poem-actions" ? "opacity-100" : "opacity-60"}
                  `} />
                </StyledLayers>
              </span>
            }
            {(user?.isAdmin || (user?.usage[dateCode]?.haikusRegenerated || 0) < USAGE_LIMIT.DAILY_REGENERATE_HAIKU) &&
              <span title="Regenerate this haiku with the same theme">
                <StyledLayers styles={altStyles || []}>
                  <PopOnClick>
                    <GenerateIcon
                      onClick={() => canRegeneratePoem && regeneratePoem()}
                      sizeOverwrite={`
                        h-[1.1rem] w-[1.1rem] md:h-6 md:w-6 
                        ${canRegeneratePoem || onboardingElement == "poem-actions" ? "cursor-pointer opacity-100" : "opacity-60"} 
                      `}
                    />
                  </PopOnClick>
                </StyledLayers>
              </span>
            }
          </div>
        }
        {regenerateImageAllowed &&
          <div className="_bg-pink-200 md:mt-[-0.05rem] mt-[-0.02rem] md:ml-[-0.2rem] ml-[-0.1rem]">
            {!user?.isAdmin && (user?.usage[dateCode]?.haikusRegenerated || 0) >= USAGE_LIMIT.DAILY_REGENERATE_HAIKU &&
              <span title="Exceeded daily limit: try again later">
                <StyledLayers styles={altStyles || []}>
                  <TbReload className={`
                h-[1.2rem] w-[1.2rem] md:h-6 md:w-6 
                ${onboardingElement == "poem-actions" ? "opacity-100" : "opacity-60"}
              `} />
                </StyledLayers>
              </span>
            }
            {(user?.isAdmin || (user?.usage[dateCode]?.haikusRegenerated || 0) < USAGE_LIMIT.DAILY_REGENERATE_HAIKU) &&
              <span title="Regenerate this haiku's art with the same theme">
                <StyledLayers styles={altStyles || []}>
                  <PopOnClick>
                    <TbReload
                      onClick={() => canRegenerateImage && regenerateImage()}
                      className={`
                  h-[1.2rem] w-[1.2rem] md:h-6 md:w-6 
                  ${canRegeneratePoem || onboardingElement == "poem-actions" ? "cursor-pointer opacity-100" : "opacity-60"} 
                `}
                    />
                  </PopOnClick>
                </StyledLayers>
              </span>
            }
          </div>
        }
      </div>
    )
  }

  useEffect(() => {
    if (haiku?.version && haiku.version != lastVersion) {
      setEditing(false);
      setLastVersion(haiku.version);
    }
  }, [haiku?.version]);

  useEffect(() => {
    // console.log(">> app._component.SidePanel.useEffect", { animationStep });

    let animationTimeout: any;

    if (animating) {
      const animateWords = async (line: number) => {
        // console.log(">> app._component.SidePanel.useEffect animateWords", { line });
        if (line < haiku.poem.length) {
          for (let i = 0; i < haiku.poem[line].length; i++) {
            animationWord = i;
            setAnimationWord(animationWord);
            if (i == (haiku.poem[line].length - 1)) {
              await delay(0);
            } else {
              await delay(50);
            }
          }
        }
      }
  
      const animateSteps = async () => {     
        for (let i = 0; i < (haiku.poem.length + 1); i++) {
          // console.log(">> app._component.SidePanel.useEffect animationStep loop", { i, pause: animationStepPause[i] });
          animationStep = i;
          setAnimationStep(animationStep);
          if (animationStep > 0) await animateWords(animationStep - 1);
          await delay(animationStepPauses[i]);
        }

        animationTimeout = loopAnimation && setTimeout(animateSteps, 0);
      }

      animationTimeout = setTimeout(animateSteps, 0);
    }

    return () => {
      animationTimeout && clearTimeout(animationTimeout);
    }
  }, [animating]);

  // console.log(">> app._component.SidePanel.useEffect", { currentPoem, editPoem, displayPoem, lastPoem });

  return (
    <div className="relative h-full">
      {/* allow editors to click out and finish */}
      {!showcaseMode &&
        <div
          className={`_bg-pink-100 fixed top-0 left-0 w-full h-full ${saving ? " opacity-50" : ""}`}
          onClick={() => editing && setEditing(false)}
        />
      }
      <div className="onboarding-container flex"
        style={{
          height: "100%",
        }}
      >
        {onboardingElement && ["poem"].includes(onboardingElement) &&
          <div className="onboarding-focus double" />
        }
        {onboardingElement && ["poem-and-poem-actions"].includes(onboardingElement) &&
          <div className="onboarding-focus" />
        }
        <div
          className={`h-full _bg-pink-200 _p-[2.5rem] ${saving ? "animate-pulse" : ""}`}
          style={{
            cursor: showcaseMode ? "pointer" : "",
            fontSize,
            width: "100vw",
            height: "min(100vh, 100dvh)",
            padding: typeof (padding) == "string"
              ? padding
              : showcaseMode
                ? "32px 32px"
                : "72px 32px"
          }}
          onTouchMove={handleTouchMove}
          onMouseLeave={handleMouseUp}
          onMouseEnter={handleMouseUp}
        >
          <div
            className="h-full _bg-purple-200 flex flex-col _transition-all w-fit m-auto md:text-[26pt] sm:text-[22pt] text-[18pt]"
            onClick={handleClickHaiku}
            title={canUpdateLayout
              ? "Update layout"
              : false //showcaseMode && canRefresh
                ? "Refresh"
                : canCopy
                  ? "Click to copy haiku poem"
                  : showcaseMode
                    ? "Click to switch to edit mode"
                    : canSwitchMode
                      ? "Click to switch to showcase mode"
                      : canUpdateLayout
                        ? "Click to change layout"
                        : ""
            }
            style={{
              cursor: canUpdateLayout
                ? "row-resize"
                : showcaseMode
                  ? "pointer"
                  : "",
              fontSize,
            }}
          >
            <PopOnClick
              className="h-full"
              color={editing ? haiku?.color : haiku?.bgColor}
              force={popPoem || editing || haiku?.version && haiku.version != lastVersion}
              disabled={editing || (!canCopy && !canSwitchMode && !canUpdateLayout)}
              active={/*quickEditing || */  !!(onboardingElement && onboardingElement.includes("poem"))}
              hoverSupported={false}
            >
              <div className="h-full inner-container _bg-yellow-200 flex flex-col justify-between gap-1">
                {
                  Array.apply(0, new Array(currentPoem.length * 2 + 1))
                    .map((_: any, j: number) => { return { spacer: !(j % 2), i: Math.floor(j / 2) } })
                    .map(({ spacer, i }) => (
                      <div
                        key={`${spacer ? "spacer-" + i : "line-" + i}`}
                        className={`line-and-spacer ${spacer ? "spacer-" + i : "line-" + i} flex flex-col ${spacer ? "_flex-grow" : "_flex-grow-0"}`}
                        style={{
                          flexGrow: spacer && layout?.spacing && layout?.spacing[i] || 0
                        }}
                      >
                        {layout?.spacing && spacer &&
                          <div
                            className="spacer _bg-orange-200 flex h-full w-full"
                            style={{
                              // flexGrow: 1
                            }}
                          >
                          </div>
                        }
                        {!spacer && i < currentPoem.length &&
                          <div
                            key={i}
                            // NOTE: leading uses EM units because fontSize can be provided as a param
                            className={`
                              _bg-pink-200 line-container flex md:my-[0.05rem] sm:my-[0.03rem] my-[0.15rem] _transition-all leading-[1.0em] tracking-[0rem]
                              ${layout?.alignments[i] == "center"
                                ? "m-auto"
                                : layout?.alignments[i] == "end"
                                  ? "my-auto ml-auto"
                                  : "my-auto mr-auto"
                              }
                          `}
                          >
                            <StyledLayers
                              className={`_bg-yellow-200 `}
                              styles={
                                showcaseMode
                                  ? [...styles, ...styles.slice(1, 2)]
                                  : styles
                              }>
                              <div
                                className="relative m-[0rem] _transition-all"
                              >
                                {/* set the width while editing */}
                                <div
                                  className={`poem-line-input poem-line-${i} _bg-orange-400 flex flex-row flex-wrap items-center md:gap-[1.0rem] gap-[0.4rem] _opacity-50 md:min-h-[3.5rem] sm:min-h-[3rem] min-h-[2.5rem] 
                                    ${canUpdateLayout
                                      ? "cursor-row-resize"
                                      : canUpdateLayout
                                        ? "cursor-row-resize"
                                        : showcaseMode || canSwitchMode
                                          ? "cursor-pointer"
                                          : ""
                                    }`}
                                  style={{
                                    userSelect: "none",
                                    WebkitUserSelect: "none",
                                    WebkitTouchCallout: "none",
                                    MozUserSelect: "none",
                                    msUserSelect: "none",
                                    WebkitTapHighlightColor: "rgba(0,0,0,0)",
                                    justifyContent: layout?.alignments[i] || "start",
                                  }}
                                // onMouseLeave={(e: any) => handleMouseLeaveLine(e, i)}
                                >
                                  {currentPoem[i].map((word: string, j: number) => (
                                    <div
                                      key={`line-${i}-word-${j}`}
                                      // @ts-ignore
                                      ref={refs[i][j]}
                                      className={`poem-line-word poem-line-word-${j} _bg-yellow-200 relative _mx-[-0.7rem] 
                                        ${saving
                                          ? "cursor-wait opacity-50 animate-pulse"
                                          : editing
                                            ? "cursor-crosshair opacity-80"
                                            : canUpdateLayout
                                              ? "cursor-row-resize"
                                              : canCopy || canSwitchMode
                                                ? "cursor-pointer" : ""
                                        }`}
                                      style={{
                                        transition: "opacity 0.5s ease-out",
                                        visibility: animating && (i == (animationStep - 1) && j >= animationWord || i >= animationStep)
                                        ? "hidden"
                                        : "visible"
                                      }}
                                      onMouseDown={(e: any) => handleMouseDownWord(e, i, j)}
                                      onTouchStart={(e: any) => handleMouseDownWord(e, i, j)}
                                      onMouseUp={(e: any) => handleMouseUp(e, i, j)}
                                      onTouchEnd={(e: any) => handleMouseUp(e, i, j)}
                                      onMouseMove={(e: any) => handleMouseMoveWord(e, i, j)}
                                      onPointerEnter={(e: any) => handlePointerEnterWord(e, i, j)}
                                    >
                                      <div
                                        className={`${displayPoem[i][j] ? "opacity-100" : "opacity-20"} transition-opacity`}
                                      >
                                        <PopOnClick
                                          color={haiku?.color}
                                          force={!displayPoem[i][j] || !!(lastPoem && lastPoem[i][j] && lastPoem[i][j] != currentPoem[i][j])}
                                          disabled={!editing || editing && !displayPoem[i][j]}
                                          hoverSupported={true}
                                        >
                                          {j == 0 &&
                                            <span>{upperCaseFirstLetter(currentPoem[i][j])}</span>
                                          }
                                          {j != 0 &&
                                            <span>{currentPoem[i][j]}</span>
                                          }
                                        </PopOnClick>
                                      </div>
                                    </div>
                                  ))
                                  }
                                </div>
                              </div>
                            </StyledLayers>
                          </div>
                        }
                        {!spacer && i == currentPoem.length - 1 && !showcaseMode && (copyAllowed || regeneratePoemAllowed || editAllowed) && (!animating || animationStep >= haiku.poem.length) &&
                          <div className="flex flex-grow-0 justify-end relative h-0">
                            <div className="absolute top-0 right-0 z-40"
                              onMouseDown={(e: any) => {
                                e.preventDefault();
                                e.stopPropagation();
                                e.nativeEvent.stopImmediatePropagation();
                              }}
                              onClick={(e: any) => {
                                e.preventDefault();
                                e.stopPropagation();
                                e.nativeEvent.stopImmediatePropagation();
                              }}
                            >
                              <PoemButtons />
                            </div>
                          </div>
                        }

                      </div>
                    ))}
              </div>
            </PopOnClick>
          </div>
        </div>
      </div >
    </div >
  )
}
