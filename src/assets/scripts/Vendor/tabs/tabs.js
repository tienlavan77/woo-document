import TagBuilder from "../helpers/tagBuilder";
import DOMValidator from "../helpers/isNodeDom";

export default class Tabs {
   #id;
   #direction;
   #tabList;
   #next;
   #onChange;
   #activeIndex;

   #el = null;
   #headerEl = null;
   #contentEl = null;

   #onHeaderClick;
   #onHeaderKeydown;

   constructor({ id, direction = "horizontal", tabList, activeIndex = 0, next, onChange } = {}) {
      if (!id || !Array.isArray(tabList) || tabList.length === 0) {
         throw new Error("Tabs: cần truyền 'id' và 'tabList' (mảng, không được rỗng).");
      }

      this.#id = id;
      this.#direction = direction === "vertical" ? "vertical" : "horizontal";
      this.#tabList = tabList;
      this.#next = typeof next === "function" ? next : null;
      this.#onChange = typeof onChange === "function" ? onChange : null;
      this.#activeIndex = this.#resolveInitialActiveIndex(activeIndex);

      // Bind 1 lần duy nhất để removeEventListener() trong destroy() hoạt động đúng.
      this.#onHeaderClick = this.#handleHeaderClick.bind(this);
      this.#onHeaderKeydown = this.#handleHeaderKeydown.bind(this);
   }

   /** Tìm index tab active hợp lệ đầu tiên (không bị disabled). */
   #resolveInitialActiveIndex(preferredIndex) {
      const list = this.#tabList;
      const isEnabled = (i) => {
         const key = Object.keys(list[i])[0];
         return list[i][key] && !list[i][key].disabled;
      };
      if (list[preferredIndex] && isEnabled(preferredIndex)) return preferredIndex;
      const fallback = list.findIndex((_, i) => isEnabled(i));
      return fallback === -1 ? 0 : fallback;
   }

   /** Tạo (nếu chưa có) và trả về DOM node của tabs. Gọi lại nhiều lần không tạo trùng. */
   render() {
      if (this.#el) return this.#el;

      const tabsDiv = TagBuilder.create("div")
         .setAttributes({ id: this.#id, className: "tabs" })
         .html(
            `<div class="tabs__cover ${this.#direction}">
               <div class="tabs__header"></div>
               <div class="tabs__content"></div>
            </div>`
         )
         .build();

      const headerEl = tabsDiv.querySelector(".tabs__header");
      const contentEl = tabsDiv.querySelector(".tabs__content");

      headerEl.setAttribute("role", "tablist");
      headerEl.setAttribute("aria-orientation", this.#direction);

      headerEl.append(...this.#buildButtons());
      contentEl.append(...this.#buildPanels());

      headerEl.addEventListener("click", this.#onHeaderClick);
      headerEl.addEventListener("keydown", this.#onHeaderKeydown);

      this.#el = tabsDiv;
      this.#headerEl = headerEl;
      this.#contentEl = contentEl;

      return tabsDiv;
   }

   /** Tạo các nút tab bằng TagBuilder. */
   #buildButtons() {
      return this.#tabList.map((tabItem, index) => {
         const key = Object.keys(tabItem)[0];
         const { tabHeader, disabled } = tabItem[key];
         const isActive = index === this.#activeIndex;

         return TagBuilder.create("div")
            .setAttributes({
               className: `tabs__button btn${isActive ? " active" : ""}${disabled ? " disabled" : ""}`,
               "data-target": key,
               role: "tab",
               id: `${key}-tab`,
               "aria-controls": key,
               "aria-selected": String(isActive),
               ...(disabled ? { "aria-disabled": "true" } : {}),
               tabindex: isActive ? "0" : "-1",
            })
            .html(tabHeader) // giữ innerHTML như bản gốc để header có thể chèn icon/markup
            .build();
      });
   }

   /** Tạo nội dung từng tab bằng TagBuilder. */
   #buildPanels() {
      return this.#tabList.map((tabItem, index) => {
         const key = Object.keys(tabItem)[0];
         const { innerHTML } = tabItem[key] || {};
         const isActive = index === this.#activeIndex;

         const builder = TagBuilder.create("div").setAttributes({
            className: `tabs__element${isActive ? " active" : ""}`,
            id: key,
            role: "tabpanel",
            "aria-labelledby": `${key}-tab`,
            tabindex: "0",
         });

         if (innerHTML) {
            if (DOMValidator.isElement(innerHTML)) builder.append(innerHTML);
            else builder.html(innerHTML);
         }

         return builder.build();
      });
   }

   /** Click trong header: tìm đúng nút được click (event delegation). */
   #handleHeaderClick(event) {
      const button = event.target.closest(".tabs__button");
      if (!button || !this.#headerEl.contains(button)) return;
      this.#activateButton(button);
   }

   /** Điều hướng bàn phím theo WAI-ARIA Tabs Pattern. */
   #handleHeaderKeydown(event) {
      const buttons = Array.from(this.#headerEl.querySelectorAll(".tabs__button"));
      const currentIndex = buttons.indexOf(document.activeElement);
      if (currentIndex === -1) return;

      const isHorizontal = this.#direction === "horizontal";
      const nextKey = isHorizontal ? "ArrowRight" : "ArrowDown";
      const prevKey = isHorizontal ? "ArrowLeft" : "ArrowUp";

      let targetIndex = null;

      if (event.key === nextKey) targetIndex = this.#findEnabledFrom(buttons, currentIndex, 1);
      else if (event.key === prevKey) targetIndex = this.#findEnabledFrom(buttons, currentIndex, -1);
      else if (event.key === "Home") targetIndex = this.#findEnabledFrom(buttons, -1, 1);
      else if (event.key === "End") targetIndex = this.#findEnabledFrom(buttons, buttons.length, -1);
      else if (event.key === "Enter" || event.key === " ") {
         event.preventDefault();
         this.#activateButton(buttons[currentIndex]);
         return;
      } else return;

      if (targetIndex !== null && targetIndex !== currentIndex) {
         event.preventDefault();
         buttons[targetIndex].focus();
         this.#activateButton(buttons[targetIndex]);
      }
   }

   /** Tìm nút kế tiếp/trước đó chưa bị disabled, có vòng lặp qua đầu/cuối danh sách. */
   #findEnabledFrom(buttons, fromIndex, step) {
      const total = buttons.length;
      for (let i = 1; i <= total; i++) {
         const idx = (fromIndex + step * i + total) % total;
         if (!buttons[idx].classList.contains("disabled")) return idx;
      }
      return null;
   }

   /** Kích hoạt 1 tab: cập nhật class + aria cho button/panel tương ứng. */
   #activateButton(button) {
      if (button.classList.contains("disabled") || button.classList.contains("active")) return;

      const key = button.dataset.target; // đọc data-target đã set ở #buildButtons
      const buttons = Array.from(this.#headerEl.querySelectorAll(".tabs__button"));
      const panels = Array.from(this.#contentEl.querySelectorAll(".tabs__element"));

      buttons.forEach((btn) => {
         const isActive = btn === button;
         btn.classList.toggle("active", isActive);
         btn.setAttribute("aria-selected", String(isActive));
         btn.tabIndex = isActive ? 0 : -1;
      });

      panels.forEach((panel) => {
         panel.classList.toggle("active", panel.id === key);
      });

      this.#activeIndex = buttons.indexOf(button);

      if (this.#next) this.#next();
      if (this.#onChange) this.#onChange(key, this.#activeIndex);

      this.#el.dispatchEvent(
         new CustomEvent("tabs:change", {
            detail: { key, index: this.#activeIndex },
            bubbles: true,
         })
      );
   }

   /** Chuyển tab bằng code, theo index (số) hoặc theo key (chuỗi). */
   goTo(indexOrKey) {
      if (!this.#headerEl) return;
      const buttons = Array.from(this.#headerEl.querySelectorAll(".tabs__button"));
      const button =
         typeof indexOrKey === "number" ? buttons[indexOrKey] : buttons.find((btn) => btn.dataset.target === indexOrKey);
      if (button) this.#activateButton(button);
   }

   /** Key của tab đang active. */
   getActiveKey() {
      return Object.keys(this.#tabList[this.#activeIndex])[0];
   }

   /** Index của tab đang active. */
   getActiveIndex() {
      return this.#activeIndex;
   }

   /** Gỡ listener và xoá tabs khỏi DOM — gọi khi không dùng nữa để tránh leak (vd trong SPA). */
   destroy() {
      if (this.#headerEl) {
         this.#headerEl.removeEventListener("click", this.#onHeaderClick);
         this.#headerEl.removeEventListener("keydown", this.#onHeaderKeydown);
      }
      this.#el?.remove();
      this.#el = null;
      this.#headerEl = null;
      this.#contentEl = null;
   }
}
