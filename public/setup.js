(() => {
  const form = document.querySelector("#setup-form");
  if (!form) return;
  const steps = [...form.querySelectorAll("fieldset")];
  const progress = [...document.querySelectorAll(".setup-progress li")];
  const next = form.querySelector(".setup-next");
  const back = form.querySelector(".setup-back");
  const submit = form.querySelector(".setup-submit");
  const error = document.querySelector("#setup-error");
  const status = document.querySelector("#setup-status");
  let active = 0,
    busy = false;
  document.body.dataset.enhanced = "true";
  const show = (number, focus = true) => {
    active = number;
    steps.forEach((step, i) => {
      step.classList.toggle("active", i === number);
    });
    progress.forEach((item, i) => {
      if (i === number) item.setAttribute("aria-current", "step");
      else item.removeAttribute("aria-current");
      item.classList.toggle("done", i < number);
    });
    document.querySelector(".progress-track span").style.transform =
      `scaleX(${(number + 1) / 3})`;
    back.hidden = number === 0;
    next.hidden = number === 2;
    submit.hidden = number !== 2;
    if (focus) {
      const field = steps[number].querySelector("input,select");
      field?.focus({ preventScroll: true });
      steps[number].scrollIntoView({
        block: "nearest",
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
    }
  };
  const validate = (number) => {
    const pass = form.elements.password,
      confirm = form.elements.password_confirm;
    confirm.setCustomValidity(
      confirm.value && confirm.value !== pass.value
        ? "Les deux mots de passe ne correspondent pas."
        : "",
    );
    pass.setCustomValidity(
      new TextEncoder().encode(pass.value).length > 72
        ? "Le mot de passe dépasse 72 octets."
        : "",
    );
    return [...steps[number].querySelectorAll("input,select")].every((field) =>
      field.reportValidity(),
    );
  };
  const driver = form.elements.driver;
  const database = () => {
    const mysql = driver.value === "mysql";
    document.querySelector("#mysql-fields").hidden = !mysql;
    document.querySelector("#sqlite-note").hidden = mysql;
    for (const name of ["db_host", "db_name", "db_user"])
      form.elements[name].required = mysql;
  };
  driver.addEventListener("change", database);
  database();
  next.addEventListener("click", () => {
    if (validate(active)) show(active + 1);
  });
  back.addEventListener("click", () => show(active - 1));
  form.addEventListener("keydown", (event) => {
    if (
      event.key === "Enter" &&
      active < 2 &&
      event.target instanceof HTMLInputElement
    ) {
      event.preventDefault();
      next.click();
    }
  });
  form.querySelectorAll(".password-toggle").forEach((button) =>
    button.addEventListener("click", () => {
      const input = document.getElementById(button.dataset.password);
      const visible = input.type === "password";
      input.type = visible ? "text" : "password";
      button.textContent = visible ? "Masquer" : "Voir";
      button.setAttribute("aria-pressed", String(visible));
    }),
  );
  form.elements.password.addEventListener("input", () => {
    const length = [...form.elements.password.value].length;
    document.querySelector(".password-meter span").style.transform =
      `scaleX(${Math.min(1, length / 20)})`;
    document.querySelector("#password-hint").textContent = length
      ? length < 12
        ? `Encore ${12 - length} caractères au minimum.`
        : "La longueur minimale est atteinte."
      : "";
    form.elements.password.setCustomValidity("");
    form.elements.password_confirm.setCustomValidity("");
  });
  form.elements.password_confirm.addEventListener("input", () =>
    form.elements.password_confirm.setCustomValidity(""),
  );
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy) return;
    for (let i = 0; i < steps.length; i++) {
      show(i, false);
      if (!validate(i)) {
        show(i);
        return;
      }
    }
    show(2, false);
    busy = true;
    form.setAttribute("aria-busy", "true");
    submit.disabled = true;
    error.hidden = true;
    status.textContent = "Connexion à la base et préparation de ton carnet…";
    try {
      const response = await fetch("setup.php", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      const result = await response.json();
      if (!response.ok) {
        if (result.code === "installation_key") show(0);
        throw new Error(result.error || "Installation impossible.");
      }
      status.textContent = "Ton carnet est prêt. Ouverture de Feuillet…";
      location.replace("index.php?dashboard=1");
    } catch (e) {
      error.textContent =
        e.message ||
        "Connexion interrompue. Vérifie ton hébergement avant de réessayer.";
      error.hidden = false;
      error.scrollIntoView({ block: "nearest" });
      status.textContent = "Tes réglages restent dans le formulaire.";
    } finally {
      busy = false;
      form.removeAttribute("aria-busy");
      submit.disabled = false;
    }
  });
  show(0, false);
})();
