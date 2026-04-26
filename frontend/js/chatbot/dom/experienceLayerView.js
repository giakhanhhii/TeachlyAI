/**
 * @param {{ experienceLayer: HTMLElement, experienceBody: HTMLElement, chatPhase: HTMLElement }} els
 */
export function createExperienceLayerView(els) {
  const { experienceLayer, experienceBody, chatPhase } = els;

  function clearVariant() {
    experienceLayer.classList.remove("experience-variant-thptqg-fullpage");
    experienceBody.classList.remove("experience-body-thptqg-fullpage");
  }

  return {
    hide() {
      clearVariant();
      experienceLayer.classList.remove("visible");
      experienceLayer.setAttribute("aria-hidden", "true");
      experienceBody.innerHTML = "";
      chatPhase.style.display = "";
    },
    prepareShow() {
      clearVariant();
      chatPhase.style.display = "none";
      experienceLayer.classList.add("visible");
      experienceLayer.setAttribute("aria-hidden", "false");
      experienceBody.innerHTML = "";
    },
    /**
     * @param {"thptqg-fullpage"|null} variant
     */
    setVariant(variant) {
      clearVariant();
      if (variant === "thptqg-fullpage") {
        experienceLayer.classList.add("experience-variant-thptqg-fullpage");
        experienceBody.classList.add("experience-body-thptqg-fullpage");
      }
    },
    get body() {
      return experienceBody;
    },
  };
}
