import {
  Children,
  Fragment,
  isValidElement,
  useId,
  useRef,
  useState,
  useLayoutEffect,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { FloatingSurface } from "./FloatingSurface";
import { searchLabel } from "./interface-geometry";

type Option = { value: string; label: string; disabled: boolean };
function textOf(value: ReactNode): string {
  if (typeof value === "string" || typeof value === "number")
    return String(value);
  if (Array.isArray(value)) return value.map(textOf).join("");
  return isValidElement<{ children?: ReactNode }>(value)
    ? textOf(value.props.children)
    : "";
}
export function selectOptions(children: ReactNode, disabled = false): Option[] {
  return Children.toArray(children).flatMap((child) => {
    if (
      !isValidElement<{
        value?: string | number;
        children?: ReactNode;
        disabled?: boolean;
      }>(child)
    )
      return [];
    if (child.type === Fragment || child.type === "optgroup")
      return selectOptions(
        child.props.children,
        disabled || !!child.props.disabled,
      );
    if (child.type !== "option") return [];
    const label = textOf(child.props.children);
    return [
      {
        value: String(child.props.value ?? label),
        label,
        disabled: disabled || !!child.props.disabled,
      },
    ];
  });
}

/** Native form semantics, with one searchable, keyboard-operable visual picker. */
export function Select({
  children,
  className = "",
  onChange,
  value,
  defaultValue,
  id,
  optionColors,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  optionColors?: Record<string, string>;
}) {
  const uid = useId();
  const native = useRef<HTMLSelectElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState(""),
    [active, setActive] = useState(0);
  const [uncontrolled, setUncontrolled] = useState(String(defaultValue ?? ""));
  const [invalid, setInvalid] = useState(false);
  const options = selectOptions(children);
  const current = String(value ?? uncontrolled);
  const selected = options.find((o) => o.value === current) || options[0];
  const filtered = options.filter((o) =>
    searchLabel(o.label).includes(searchLabel(query)),
  );
  const searchable = options.length > 6;
  const title = props["aria-label"] || props.title || "Choisir une option";
  const close = () => {
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
  };
  useLayoutEffect(() => {
    if (open && searchable) search.current?.focus({ preventScroll: true });
  }, [open]);
  useLayoutEffect(() => {
    if (open)
      document
        .getElementById(`${uid}-option-${active}`)
        ?.scrollIntoView({ block: "nearest" });
  }, [active, open, query]);
  function choose(option?: Option) {
    if (!option || option.disabled || !native.current) return;
    native.current.value = option.value;
    native.current.dispatchEvent(new Event("change", { bubbles: true }));
    close();
  }
  function show() {
    if (props.disabled) return;
    setQuery("");
    setActive(
      Math.max(
        0,
        options.findIndex((o) => o.value === current && !o.disabled),
      ),
    );
    setOpen(true);
  }
  function move(direction: number) {
    if (!filtered.some((o) => !o.disabled)) return;
    let index = active;
    for (let i = 0; i < filtered.length; i++) {
      index = (index + direction + filtered.length) % filtered.length;
      if (!filtered[index].disabled) break;
    }
    setActive(index);
  }
  function keys(e: React.KeyboardEvent) {
    if (
      ["ArrowDown", "ArrowUp", "Home", "End", "Enter", " "].includes(e.key) &&
      !(e.target instanceof HTMLInputElement && e.key === " ")
    ) {
      e.preventDefault();
      e.stopPropagation();
      if (!open) {
        show();
        return;
      }
      if (e.key === "ArrowDown") move(1);
      else if (e.key === "ArrowUp") move(-1);
      else if (e.key === "Home")
        setActive(
          Math.max(
            0,
            filtered.findIndex((o) => !o.disabled),
          ),
        );
      else if (e.key === "End")
        setActive(
          filtered.length -
            1 -
            [...filtered].reverse().findIndex((o) => !o.disabled),
        );
      else choose(filtered[active]);
    } else if (e.key === "Tab") {
      setOpen(false);
      trigger.current?.focus({ preventScroll: true });
    } else if (!searchable && e.key.length === 1 && open) {
      const next = filtered.findIndex(
        (o, i) =>
          i > active &&
          !o.disabled &&
          searchLabel(o.label).startsWith(searchLabel(e.key)),
      );
      setActive(
        next >= 0
          ? next
          : Math.max(
              0,
              filtered.findIndex(
                (o) =>
                  !o.disabled &&
                  searchLabel(o.label).startsWith(searchLabel(e.key)),
              ),
            ),
      );
    }
  }
  return (
    <span className={`feuillet-select ${className}`}>
      <select
        {...props}
        id={id ? `${id}-native` : undefined}
        ref={native}
        className="feuillet-select-native"
        aria-hidden="true"
        tabIndex={-1}
        value={value}
        defaultValue={defaultValue}
        onInvalid={(e) => {
          e.preventDefault();
          setInvalid(true);
          trigger.current?.focus();
          show();
        }}
        onChange={(e) => {
          setInvalid(false);
          setUncontrolled(e.target.value);
          onChange?.(e);
        }}
      >
        {children}
      </select>
      <button
        type="button"
        id={id}
        ref={trigger}
        className="feuillet-select-trigger"
        disabled={props.disabled}
        role="combobox"
        aria-expanded={open}
        aria-controls={`${uid}-list`}
        aria-haspopup="listbox"
        aria-label={props["aria-label"]}
        aria-labelledby={props["aria-labelledby"]}
        aria-required={props.required}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${uid}-error` : props["aria-describedby"]}
        aria-activedescendant={open ? `${uid}-option-${active}` : undefined}
        title={props.title}
        onKeyDown={keys}
        onClick={() => (open ? close() : show())}
      >
        <span>
          {optionColors?.[selected?.value || ""] && (
            <i
              className="feuillet-option-color"
              style={{ backgroundColor: optionColors[selected?.value || ""] }}
            />
          )}
          {selected?.label || "Choisir…"}
        </span>
        <ChevronDown size={15} />
      </button>
      {invalid && (
        <small
          id={`${uid}-error`}
          role="alert"
          className="feuillet-select-error"
        >
          Choisis une option.
        </small>
      )}
      {open && (
        <FloatingSurface
          anchor={trigger.current}
          onClose={close}
          label={title}
          role="presentation"
          className="feuillet-select-popup"
        >
          {searchable && (
            <div className="feuillet-select-search">
              <Search size={16} />
              <input
                ref={search}
                aria-label={`Rechercher · ${title}`}
                placeholder="Rechercher une option…"
                role="combobox"
                aria-controls={`${uid}-list`}
                aria-expanded="true"
                aria-activedescendant={`${uid}-option-${active}`}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={keys}
              />
            </div>
          )}
          <div
            id={`${uid}-list`}
            role="listbox"
            aria-label={title}
            className="feuillet-select-options"
          >
            {filtered.map((option, i) => (
              <div
                id={`${uid}-option-${i}`}
                key={option.value}
                role="option"
                aria-selected={option.value === selected?.value}
                aria-disabled={option.disabled || undefined}
                className={`feuillet-select-option ${i === active ? "is-active" : ""}`}
                onPointerMove={() => !option.disabled && setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={(event) => {
                  event.preventDefault();
                  choose(option);
                }}
              >
                <span>
                  {optionColors?.[option.value] && (
                    <i
                      className="feuillet-option-color"
                      style={{ backgroundColor: optionColors[option.value] }}
                    />
                  )}
                  {option.label}
                </span>
                {option.value === selected?.value && <Check size={16} />}
              </div>
            ))}
            {!filtered.length && (
              <p className="feuillet-menu-empty">Aucun résultat</p>
            )}
          </div>
        </FloatingSurface>
      )}
    </span>
  );
}
