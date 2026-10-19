window.__ModuleLoader__.load({
	id: "dsh-stream-focus",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let _deepseek_ai_dsh_client_store = require("@deepseek-ai/dsh-client-store");
		let react = require("react");
		const MOTION_MS = 180;
		const EASING = "cubic-bezier(0.2, 0.8, 0.2, 1)";
		/**
		* Animate a disclosure open after its official click.
		*
		* Disclosure bodies are conditionally mounted, so there is no persistent
		* height to transition. The new body is measured, pinned to zero for one
		* commit, then animated to its natural height while fading in.
		*
		* @param element - disclosure control that was clicked.
		* @param win - window owning animation and reduced-motion preferences.
		* @param toggle - official click action.
		*/
		function openDisclosure(element, win, toggle) {
			toggle();
			const body = findDisclosureBody(element);
			if (body === null || !canAnimate(body, win)) return;
			const height = body.getBoundingClientRect().height;
			if (height <= 0) return;
			body.style.overflow = "hidden";
			body.style.height = "0px";
			body.style.opacity = "0";
			const animation = body.animate([{
				height: "0px",
				opacity: 0
			}, {
				height: `${height}px`,
				opacity: 1
			}], {
				duration: MOTION_MS,
				easing: EASING
			});
			const clear = () => {
				body.style.overflow = "";
				body.style.height = "";
				body.style.opacity = "";
			};
			animation.addEventListener("finish", clear, { once: true });
			animation.addEventListener("cancel", clear, { once: true });
		}
		/**
		* Animate a disclosure closed, then run the official click.
		*
		* The body stays mounted during the shrink. A pending set prevents the next
		* reconciliation from starting a second close on the same row.
		*
		* @param element - disclosure control that would be clicked.
		* @param win - window owning animation and reduced-motion preferences.
		* @param toggle - official click action.
		* @param pending - rows currently waiting for their close animation.
		*/
		function closeDisclosure(element, win, toggle, pending) {
			if (pending.has(element)) return false;
			const body = findDisclosureBody(element);
			if (body === null || !canAnimate(body, win)) {
				toggle();
				return false;
			}
			const height = body.getBoundingClientRect().height;
			if (height <= 0) {
				toggle();
				return false;
			}
			pending.add(element);
			body.style.overflow = "hidden";
			body.style.height = `${height}px`;
			body.style.opacity = "1";
			const animation = body.animate([{
				height: `${height}px`,
				opacity: 1
			}, {
				height: "0px",
				opacity: 0
			}], {
				duration: MOTION_MS,
				easing: EASING
			});
			let settled = false;
			const finish = () => {
				if (settled) return;
				settled = true;
				body.style.overflow = "";
				body.style.height = "";
				body.style.opacity = "";
				pending.delete(element);
				toggle();
			};
			animation.addEventListener("finish", finish, { once: true });
			animation.addEventListener("cancel", finish, { once: true });
			return true;
		}
		/**
		* Find the body belonging to a disclosure control.
		*
		* Standard disclosures put the body beside the header wrapper; Bash puts its
		* body next to the clickable row inside the card. Walking a few ancestors and
		* taking the first non-containing sibling covers both shapes.
		*
		* @param element - clicked disclosure control.
		* @returns the mounted body, if any.
		*/
		function findDisclosureBody(element) {
			let node = element;
			for (let depth = 0; depth < 3; depth += 1) {
				const parent = node.parentElement;
				if (parent === null) break;
				for (const child of parent.children) {
					if (!(child instanceof HTMLElement) || child === node || child.contains(element)) continue;
					if (child.matches("script, style")) continue;
					if (child.getBoundingClientRect().height > 0) return child;
				}
				node = parent;
			}
			return null;
		}
		function canAnimate(body, win) {
			return typeof body.animate === "function" && (typeof win.matchMedia !== "function" || !win.matchMedia("(prefers-reduced-motion: reduce)").matches);
		}
		//#endregion
		//#region lib/types/client/highlight-fade.js
		/** CSS Custom Highlight based fade for streamed text without DOM mutation. */
		const FADE_MS = 240;
		const MAX_GLYPHS = 160;
		const STEPS = 12;
		const ALPHAS = [
			.03,
			.06,
			.1,
			.16,
			.24,
			.34,
			.46,
			.6,
			.74,
			.86,
			.95,
			1
		];
		const SKIP = "code,pre,a,.katex,script,style";
		/**
		* Fade newly appended text by highlighting its grapheme ranges.
		*
		* The browser's highlight registry styles text ranges without changing the
		* DOM, so React ownership, Markdown structure, selection, and copy semantics
		* stay untouched. Unsupported browsers simply see the normal output.
		*/
		var HighlightFade = class {
			doc;
			win;
			name;
			realm;
			highlights = [];
			observer;
			roots = /* @__PURE__ */ new Set();
			texts = /* @__PURE__ */ new WeakMap();
			glyphs = [];
			frame = null;
			observerActive = false;
			/**
			* @param doc - document owning the text.
			* @param win - window exposing CSS.highlights.
			* @param name - unique highlight namespace for this fade instance.
			*/
			constructor(doc = document, win = window, name = "dsh-stream-fade") {
				this.doc = doc;
				this.win = win;
				this.name = name;
				this.realm = win;
				const registry = this.realm.CSS?.highlights;
				const Ctor = this.realm.Highlight;
				if (registry === void 0 || Ctor === void 0) {
					this.observer = null;
					return;
				}
				for (let index = 0; index < STEPS; index += 1) {
					const highlight = new Ctor();
					this.highlights.push(highlight);
					registry.set(`${name}-${index}`, highlight);
				}
				this.installStyle();
				this.observer = new this.win.MutationObserver(() => {
					this.scan();
				});
			}
			/** Observe a root and start fading its newly appended text. */
			observe(root) {
				if (this.observer === null || this.roots.has(root)) return;
				this.roots.add(root);
				root.dataset.highlightFade = this.name;
				this.record(root);
				this.observer.observe(root, {
					subtree: true,
					childList: true,
					characterData: true
				});
				this.observerActive = true;
			}
			/** Stop observing one root and drop its pending ranges. */
			unobserve(root) {
				this.roots.delete(root);
				delete root.dataset.highlightFade;
				this.dropRanges(root);
				if (this.roots.size === 0) this.observer?.disconnect();
			}
			/** Stop observing everything and clear the registry. */
			stop() {
				for (const root of this.roots) delete root.dataset.highlightFade;
				this.roots.clear();
				this.glyphs.length = 0;
				this.clearHighlights();
				this.observer?.disconnect();
				this.observerActive = false;
				if (this.frame !== null) {
					this.win.cancelAnimationFrame(this.frame);
					this.frame = null;
				}
				const registry = this.realm.CSS?.highlights;
				if (registry !== void 0) for (let index = 0; index < STEPS; index += 1) registry.delete(`${this.name}-${index}`);
			}
			installStyle() {
				const id = `dsh-stream-focus-${this.name}`;
				if (this.doc.getElementById(id) !== null) return;
				const style = this.doc.createElement("style");
				style.id = id;
				style.textContent = ALPHAS.map((alpha, index) => `::highlight(${this.name}-${index}){color:color-mix(in srgb,currentColor ${Math.round(alpha * 100)}%,transparent)}`).join("\n");
				this.doc.head.append(style);
			}
			scan() {
				for (const root of this.roots) {
					const walker = this.doc.createTreeWalker(root, 4);
					let node = walker.nextNode();
					while (node !== null) {
						const text = node;
						if (text.parentElement?.closest(SKIP) === null) this.recordText(text);
						node = walker.nextNode();
					}
				}
			}
			record(root) {
				const walker = this.doc.createTreeWalker(root, 4);
				let node = walker.nextNode();
				while (node !== null) {
					const text = node;
					if (text.parentElement?.closest(SKIP) === null) this.texts.set(text, text.data);
					node = walker.nextNode();
				}
			}
			recordText(text) {
				const previous = this.texts.get(text);
				const next = text.data;
				this.texts.set(text, next);
				if (next === previous) return;
				let start = 0;
				if (previous !== void 0) {
					if (!next.startsWith(previous)) return;
					start = previous.length;
				}
				const segmenter = typeof Intl.Segmenter === "function" ? new Intl.Segmenter(void 0, { granularity: "grapheme" }) : null;
				const now = this.win.performance.now();
				if (segmenter === null) for (let index = start; index < next.length; index += 1) this.pushGlyph(text, index, index + 1, now);
				else for (const part of segmenter.segment(next.slice(start))) {
					const from = start + part.index;
					this.pushGlyph(text, from, from + part.segment.length, now);
				}
				while (this.glyphs.length > MAX_GLYPHS) {
					const dropped = this.glyphs.shift();
					if (dropped !== void 0) this.setBucket(dropped, STEPS - 1);
				}
				this.schedule();
			}
			pushGlyph(node, start, end, born) {
				if (start >= end) return;
				const range = this.doc.createRange();
				range.setStart(node, start);
				range.setEnd(node, end);
				this.glyphs.push({
					range,
					born,
					bucket: 0
				});
				this.highlights[0]?.add(range);
			}
			schedule() {
				if (this.frame !== null) return;
				this.frame = this.win.requestAnimationFrame(() => {
					this.frame = null;
					this.update();
				});
			}
			update() {
				const now = this.win.performance.now();
				let pending = false;
				for (let index = this.glyphs.length - 1; index >= 0; index -= 1) {
					const glyph = this.glyphs[index];
					if (glyph === void 0) continue;
					if (!glyph.range.startContainer.isConnected || now - glyph.born >= FADE_MS) {
						this.setBucket(glyph, STEPS - 1);
						this.glyphs.splice(index, 1);
						continue;
					}
					const bucket = Math.min(STEPS - 1, Math.floor((now - glyph.born) / FADE_MS * STEPS));
					if (bucket !== glyph.bucket) this.setBucket(glyph, bucket);
					pending = true;
				}
				if (pending) this.schedule();
				else this.clearHighlights();
			}
			setBucket(glyph, bucket) {
				this.highlights[glyph.bucket]?.delete(glyph.range);
				glyph.bucket = bucket;
				if (bucket < STEPS - 1) this.highlights[bucket]?.add(glyph.range);
			}
			clearHighlights() {
				for (const highlight of this.highlights) for (const glyph of this.glyphs) highlight.delete(glyph.range);
			}
			dropRanges(root) {
				for (let index = this.glyphs.length - 1; index >= 0; index -= 1) {
					const glyph = this.glyphs[index];
					if (glyph !== void 0 && root.contains(glyph.range.startContainer)) {
						this.setBucket(glyph, STEPS - 1);
						this.glyphs.splice(index, 1);
					}
				}
			}
		};
		//#endregion
		//#region lib/types/client/decision.js
		/** Chooses the disclosures that belong to the running process window. */
		/**
		* Select one process window for the running Turn.
		*
		* The newest streaming reasoning wins. Otherwise the Tools after the newest
		* reasoning win, so a fast tool that settles before an observed running state
		* still opens. Without a newer Tool, the newest reasoning stays open while its
		* answer begins. Every older automatic disclosure closes; a still-running Tool
		* and every reader-owned disclosure stay untouched.
		*
		* @param group - current process group and its rows.
		* @returns deterministic opens, closes, and the owned target keys.
		*/
		function decideWindow(group) {
			const candidates = [...group.candidates].sort((left, right) => left.order - right.order);
			const reasoning = candidates.filter((candidate) => candidate.kind === "reasoning");
			const newestReasoning = reasoning.at(-1);
			const streamingReasoning = reasoning.filter((candidate) => candidate.active).at(-1);
			const toolsAfterReasoning = candidates.filter((candidate) => candidate.kind === "tool" && (newestReasoning === void 0 || candidate.order > newestReasoning.order));
			const targets = streamingReasoning !== void 0 ? [streamingReasoning] : toolsAfterReasoning.length > 0 ? toolsAfterReasoning : newestReasoning === void 0 ? [] : [newestReasoning];
			const targetKeys = new Set(targets.map((candidate) => candidate.key));
			return {
				openGroup: !group.open && !group.suppressed,
				open: targets.filter((candidate) => !candidate.open && candidate.manual !== "closed").map((candidate) => candidate.key),
				close: candidates.filter((candidate) => candidate.open && candidate.auto && !targetKeys.has(candidate.key) && !candidate.active && candidate.manual !== "open").map((candidate) => candidate.key),
				targets: [...targetKeys]
			};
		}
		//#endregion
		//#region lib/types/client/conductor.js
		const GROUP_SELECTOR = "[data-chat-group-key]";
		const GROUP_CONTENT_SELECTOR = "[data-step-process-content]";
		const RUNNING_SELECTOR$1 = "[data-chat-running]";
		const DISCLOSURE_SELECTOR$1 = "[data-disclosure-row][aria-expanded]";
		const OPEN_FADE_MS = 180;
		const ATTRIBUTE_FILTER$1 = [
			"aria-expanded",
			"data-chat-following-tail",
			"data-chat-running",
			"data-expanded",
			"data-state",
			"hidden"
		];
		/**
		* Keep the running Turn's process disclosures in one reader-controlled window.
		*
		* The conductor never renders. It reads the semantically attributed Chat DOM,
		* toggles the same disclosure controls a reader would click, and keeps the
		* window pinned to its newest row while the reader has not scrolled away.
		*/
		var StreamWindowConductor = class {
			doc;
			win;
			active = false;
			root = null;
			activeGroup = null;
			frame = null;
			followObserver = null;
			followBody = null;
			followBodyOverflowX = "";
			followBodyMaskImage = "";
			followBodyMinHeight = "";
			followBodyHeight = "";
			followBodyMaxHeight = "";
			heightFrozen = false;
			lastUserGesture = 0;
			followRepairTimer = null;
			fadeElement = null;
			fadeGroup = null;
			fadeGroupPosition = "";
			progressTrack = null;
			progressThumb = null;
			progressFrame = null;
			progressHeight = 0;
			progressTop = 0;
			progressTime = null;
			progressInitialized = false;
			lastContentGrowth = 0;
			followIntent = false;
			contentRepairTimer = null;
			textFade = null;
			outerGuard = null;
			openAnimation = null;
			observer = null;
			/** Rows this plugin opened and is therefore allowed to close later. */
			autoKeys = /* @__PURE__ */ new Set();
			/** Process groups this plugin opened. */
			autoGroups = /* @__PURE__ */ new Set();
			/** Group keys the reader deliberately closed. */
			suppressedGroups = /* @__PURE__ */ new Set();
			/** Reader's explicit open/closed choice per row key. */
			manualRows = /* @__PURE__ */ new Map();
			pendingClose = /* @__PURE__ */ new Set();
			transitionTimer = null;
			autoClickDepth = 0;
			/**
			* @param doc - document that owns the running Chat.
			* @param win - window supplying MutationObserver and rAF.
			*/
			constructor(doc = document, win = window) {
				this.doc = doc;
				this.win = win;
			}
			/** Start observing the Chat. Idempotent. */
			start() {
				if (this.active) return;
				this.active = true;
				this.doc.addEventListener("click", this.onClick, true);
				const body = this.doc.body;
				if (body !== null) {
					this.observer = new this.win.MutationObserver((records) => {
						this.onMutations(records);
					});
					this.observer.observe(body, {
						subtree: true,
						childList: true,
						attributes: true,
						attributeFilter: [...ATTRIBUTE_FILTER$1]
					});
				}
				this.sync();
			}
			/** Stop observing and restore every automatic open state. */
			stop() {
				if (!this.active) return;
				this.active = false;
				this.doc.removeEventListener("click", this.onClick, true);
				this.observer?.disconnect();
				this.observer = null;
				if (this.frame !== null) {
					this.win.cancelAnimationFrame(this.frame);
					this.frame = null;
				}
				this.resetWindow();
				this.root = null;
			}
			/** Reconcile the current DOM with the window decision. Public for tests. */
			sync() {
				if (!this.active || this.transitionTimer !== null) return;
				const running = this.doc.querySelector(RUNNING_SELECTOR$1);
				if (running === null) {
					this.resetWindow();
					return;
				}
				const root = running.closest("[data-chat-flow]:not([data-step-process-content])") ?? running.closest("[data-chat-flow]");
				if (root === null) {
					this.resetWindow();
					return;
				}
				if (root !== this.root) {
					this.resetWindow();
					this.root = root;
				}
				const group = [...root.querySelectorAll(GROUP_SELECTOR)].at(-1);
				if (group === void 0) return;
				if (!this.isLatestTurn(root, group)) {
					this.resetWindow();
					return;
				}
				if (group !== this.activeGroup) {
					this.cancelOpenAnimation();
					this.detachFollow();
					this.closeOtherWindows(group);
					this.activeGroup = group;
					this.attachFollow(group);
				}
				const snapshot = this.snapshot(group);
				if (snapshot === null) return;
				const decision = decideWindow(snapshot.model);
				if (decision.openGroup) {
					this.autoOpen(snapshot.header, group, snapshot.key);
					return;
				}
				const opens = decision.open.map((key) => snapshot.elements.get(key)).filter((candidate) => candidate !== void 0 && !candidate.open && candidate.element.isConnected);
				const closes = decision.close.map((key) => snapshot.elements.get(key)).filter((candidate) => candidate !== void 0 && candidate.open && candidate.element.isConnected);
				const wasAtBottom = this.followBody !== null && this.nearBottomElement(this.followBody);
				if (opens.length > 0 && closes.length > 0) this.freezeWindowHeight();
				let closeAnimated = false;
				for (const candidate of closes) {
					if (this.closeRow(candidate.element)) closeAnimated = true;
					this.autoKeys.delete(candidate.key);
				}
				if (closeAnimated && opens.length > 0) this.deferSync();
				else for (const candidate of opens) {
					this.openRow(candidate.element);
					this.autoKeys.add(candidate.key);
				}
				if (wasAtBottom && (opens.length > 0 || closes.length > 0)) this.scheduleFollowRepair();
			}
			/** Bind bottom following and its reader-override signals to the active window. */
			attachFollow(group) {
				const body = group.querySelector("[data-step-process-body]");
				if (body === null) return;
				const content = group.querySelector(GROUP_CONTENT_SELECTOR);
				this.followBody = body;
				this.followBodyOverflowX = body.style.overflowX;
				this.followBodyMaskImage = body.style.maskImage;
				this.followBodyMinHeight = body.style.minHeight;
				this.followBodyHeight = body.style.height;
				this.followBodyMaxHeight = body.style.maxHeight;
				body.style.overflowX = "hidden";
				body.style.maskImage = "none";
				this.attachFade(group);
				this.attachProgress(group, body);
				this.textFade = new HighlightFade(this.doc, this.win, "dsh-stream-process");
				this.textFade.observe(content ?? group);
				body.addEventListener("scroll", this.onProgressScroll, { passive: true });
				body.addEventListener("scrollend", this.onFollowSettled);
				body.addEventListener("wheel", this.onReaderGesture, { passive: true });
				body.addEventListener("touchstart", this.onReaderGesture, { passive: true });
				body.addEventListener("pointerdown", this.onReaderGesture, { passive: true });
				body.addEventListener("keydown", this.onReaderGesture);
				if (typeof this.win.ResizeObserver === "function") {
					this.followObserver = new this.win.ResizeObserver(() => {
						this.lastContentGrowth = this.win.Date.now();
						this.rememberHeight();
						this.scheduleProgress();
						this.scheduleContentRepair();
					});
					this.followObserver.observe(body);
					if (content !== null) this.followObserver.observe(content);
				}
			}
			/** Release the active window's observer and reader signals. */
			detachFollow() {
				const body = this.followBody;
				if (body !== null) {
					body.removeEventListener("scroll", this.onProgressScroll);
					body.removeEventListener("scrollend", this.onFollowSettled);
					body.removeEventListener("wheel", this.onReaderGesture);
					body.removeEventListener("touchstart", this.onReaderGesture);
					body.removeEventListener("pointerdown", this.onReaderGesture);
					body.removeEventListener("keydown", this.onReaderGesture);
					body.style.overflowX = this.followBodyOverflowX;
					body.style.maskImage = this.followBodyMaskImage;
					body.style.minHeight = this.followBodyMinHeight;
					body.style.height = this.followBodyHeight;
					body.style.maxHeight = this.followBodyMaxHeight;
				}
				this.removeProgress();
				this.followObserver?.disconnect();
				this.followObserver = null;
				this.followBody = null;
				this.followBodyOverflowX = "";
				this.followBodyMaskImage = "";
				this.followBodyMinHeight = "";
				this.followBodyHeight = "";
				this.followBodyMaxHeight = "";
				this.heightFrozen = false;
				this.followIntent = false;
				if (this.contentRepairTimer !== null) {
					this.win.clearTimeout(this.contentRepairTimer);
					this.contentRepairTimer = null;
				}
				if (this.followRepairTimer !== null) {
					this.win.clearTimeout(this.followRepairTimer);
					this.followRepairTimer = null;
				}
				this.removeFade();
			}
			/** Pin the outer transcript on each height step while the window reveals. */
			startOuterGuard(group) {
				this.stopOuterGuard();
				if (group.closest("[data-conversation-scroll]") === null || this.doc.querySelector("[data-chat-following-tail]") === null) return;
				if (typeof this.win.ResizeObserver !== "function") return;
				const observer = new this.win.ResizeObserver(() => {
					this.pinOuterNow(group);
				});
				observer.observe(group);
				this.outerGuard = {
					observer,
					group
				};
				this.pinOuterNow(group);
			}
			stopOuterGuard() {
				this.outerGuard?.observer.disconnect();
				this.outerGuard = null;
			}
			/** Keep the outer transcript at its floor without waiting a frame for Chat's follow. */
			pinOuterNow(group) {
				const outer = group.closest("[data-conversation-scroll]");
				if (outer === null || this.doc.querySelector("[data-chat-following-tail]") === null) return;
				const floor = Math.max(0, outer.scrollHeight - outer.clientHeight);
				if (Math.abs(floor - outer.scrollTop) > .5) outer.scrollTop = floor;
			}
			/** Fade the lowest content edge so new lines enter instead of popping. */
			attachFade(group) {
				this.removeFade();
				this.fadeGroup = group;
				this.fadeGroupPosition = group.style.position;
				if (this.win.getComputedStyle(group).position === "static") group.style.position = "relative";
				const fade = this.doc.createElement("div");
				fade.dataset.streamFade = "";
				fade.setAttribute("aria-hidden", "true");
				fade.style.cssText = "position:absolute;left:0;right:12px;bottom:0;height:16px;pointer-events:none;background:linear-gradient(to bottom, transparent, color-mix(in srgb, var(--dsw-alias-bg-base) 45%, transparent));z-index:1";
				group.append(fade);
				this.fadeElement = fade;
			}
			removeFade() {
				this.fadeElement?.remove();
				this.fadeElement = null;
				if (this.fadeGroup !== null) this.fadeGroup.style.position = this.fadeGroupPosition;
				this.fadeGroup = null;
				this.fadeGroupPosition = "";
			}
			onReaderGesture = () => {
				this.lastUserGesture = this.win.Date.now();
			};
			onProgressScroll = () => {
				const body = this.followBody;
				if (body !== null) {
					if (this.nearBottomElement(body)) this.followIntent = true;
					else if (this.win.Date.now() - this.lastUserGesture < 1200) this.followIntent = false;
				}
				this.scheduleProgress();
			};
			/** A delayed, one-shot fallback for growth where no reliable scrollend arrives. */
			scheduleContentRepair() {
				if (!this.followIntent || this.contentRepairTimer !== null) return;
				this.contentRepairTimer = this.win.setTimeout(() => {
					this.contentRepairTimer = null;
					const body = this.followBody;
					if (body === null || !body.isConnected || !this.followIntent) return;
					if (this.win.Date.now() - this.lastUserGesture < 1e3) return;
					const floor = Math.max(0, body.scrollHeight - body.clientHeight);
					if (floor - body.scrollTop <= 1) return;
					body.scrollTop = floor;
					body.dispatchEvent(new Event("scroll"));
					this.win.requestAnimationFrame(() => {
						if (body.isConnected) body.dispatchEvent(new Event("scrollend"));
					});
				}, 350);
			}
			/**
			* Official smooth follow targets the floor measured when growth starts. If content
			* grows again before scrollend, settle can release follow intent even though the
			* reader never moved. Re-anchor once and let the official scrollend sampler adopt
			* the new bottom position.
			*/
			onFollowSettled = () => {
				const body = this.followBody;
				if (body === null || !body.isConnected) return;
				const now = this.win.Date.now();
				if (now - this.lastUserGesture < 1e3) return;
				if (now - this.lastContentGrowth > 1500) return;
				const floor = Math.max(0, body.scrollHeight - body.clientHeight);
				const delta = floor - body.scrollTop;
				if (delta <= 1 || delta > 120) return;
				body.scrollTop = floor;
				body.dispatchEvent(new Event("scroll"));
				this.win.requestAnimationFrame(() => {
					if (body.isConnected) body.dispatchEvent(new Event("scrollend"));
				});
			};
			attachProgress(group, body) {
				this.removeProgress();
				const doc = this.doc;
				if (doc.getElementById("dsh-stream-focus-native-scrollbar") === null) {
					const style = doc.createElement("style");
					style.id = "dsh-stream-focus-native-scrollbar";
					style.textContent = ["[data-stream-native-scrollbar]::-webkit-scrollbar-thumb{background:transparent!important}", "[data-stream-native-scrollbar]{scrollbar-color:transparent transparent!important}"].join("\n");
					doc.head.append(style);
				}
				body.setAttribute("data-stream-native-scrollbar", "");
				const track = doc.createElement("div");
				track.dataset.streamProgress = "";
				track.setAttribute("aria-hidden", "true");
				track.style.cssText = "position:absolute;right:2px;top:8px;bottom:8px;width:3px;pointer-events:none;z-index:2;opacity:0;transition:opacity 160ms ease;";
				const thumb = doc.createElement("div");
				thumb.dataset.streamProgressThumb = "";
				thumb.style.cssText = "position:absolute;right:0;top:0;width:3px;min-height:18px;border-radius:999px;background:color-mix(in srgb, currentColor 34%, transparent);will-change:height,transform";
				track.append(thumb);
				group.append(track);
				this.progressTrack = track;
				this.progressThumb = thumb;
				this.progressHeight = 0;
				this.progressTop = 0;
				this.progressTime = null;
				this.progressInitialized = false;
				this.scheduleProgress();
			}
			removeProgress() {
				if (this.progressFrame !== null) {
					this.win.cancelAnimationFrame(this.progressFrame);
					this.progressFrame = null;
				}
				this.followBody?.removeAttribute("data-stream-native-scrollbar");
				this.progressTrack?.remove();
				this.progressTrack = null;
				this.progressThumb = null;
				this.progressHeight = 0;
				this.progressTop = 0;
				this.progressTime = null;
				this.progressInitialized = false;
			}
			scheduleProgress() {
				if (this.progressFrame !== null) return;
				this.progressFrame = this.win.requestAnimationFrame((time) => {
					this.progressFrame = null;
					this.updateProgress(time);
				});
			}
			updateProgress(time) {
				const body = this.followBody;
				const track = this.progressTrack;
				const thumb = this.progressThumb;
				if (body === null || track === null || thumb === null) return;
				const trackHeight = track.clientHeight;
				const contentHeight = body.scrollHeight;
				const clientHeight = body.clientHeight;
				if (trackHeight <= 0) return;
				if (this.nearBottomElement(body)) this.followIntent = true;
				if (contentHeight <= clientHeight + 1) {
					track.style.opacity = "0";
					this.progressTime = null;
					this.progressInitialized = false;
					return;
				}
				track.style.opacity = "1";
				const targetHeight = Math.max(18, Math.round(trackHeight * (clientHeight / contentHeight)));
				const travel = Math.max(0, trackHeight - targetHeight);
				const maxScroll = Math.max(1, contentHeight - clientHeight);
				const targetTop = Math.round(body.scrollTop / maxScroll * travel);
				if (!this.progressInitialized) {
					this.progressInitialized = true;
					this.progressHeight = targetHeight;
					this.progressTop = targetTop;
					this.progressTime = time;
					thumb.style.height = `${targetHeight}px`;
					thumb.style.transform = `translateY(${targetTop}px)`;
					return;
				}
				const elapsed = this.progressTime === null ? 1e3 / 60 : Math.min(32, time - this.progressTime);
				this.progressTime = time;
				const factor = 1 - Math.exp(-elapsed / 90);
				this.progressHeight += (targetHeight - this.progressHeight) * factor;
				this.progressTop += (targetTop - this.progressTop) * factor;
				const heightSettled = Math.abs(targetHeight - this.progressHeight) <= .25;
				const topSettled = Math.abs(targetTop - this.progressTop) <= .25;
				if (heightSettled) this.progressHeight = targetHeight;
				if (topSettled) this.progressTop = targetTop;
				thumb.style.height = `${this.progressHeight.toFixed(2)}px`;
				thumb.style.transform = `translateY(${this.progressTop.toFixed(2)}px)`;
				if (!heightSettled || !topSettled) this.scheduleProgress();
				else this.progressTime = null;
			}
			nearBottomElement(body) {
				return body.scrollHeight - body.clientHeight - body.scrollTop <= 2;
			}
			/**
			* Re-arm official follow after a row transition when the reader never touched
			* the window and it was following before the transition. This is a one-shot
			* repair, not a second follow loop.
			*/
			scheduleFollowRepair() {
				if (this.followRepairTimer !== null) this.win.clearTimeout(this.followRepairTimer);
				this.followRepairTimer = this.win.setTimeout(() => {
					this.followRepairTimer = null;
					const body = this.followBody;
					if (body === null || !body.isConnected) return;
					if (this.win.Date.now() - this.lastUserGesture < 1e3) return;
					if (this.nearBottomElement(body)) return;
					body.scrollTop = Math.max(0, body.scrollHeight - body.clientHeight);
					this.win.requestAnimationFrame(() => {
						body.dispatchEvent(new Event("scrollend"));
					});
				}, 600);
			}
			/** Freeze the window height for a row-to-row transition so outer follow has no floor change. */
			freezeWindowHeight() {
				const body = this.followBody;
				if (body === null || this.heightFrozen) return;
				const height = body.getBoundingClientRect().height;
				if (height <= 0) return;
				this.heightFrozen = true;
				const fixed = `${Math.ceil(height)}px`;
				body.style.height = fixed;
				body.style.maxHeight = fixed;
				body.style.minHeight = fixed;
			}
			/** Keep the active window from shrinking below the height it has already shown. */
			rememberHeight() {
				const body = this.followBody;
				if (body === null) return;
				const height = body.getBoundingClientRect().height;
				if (height > (Number.parseFloat(body.style.minHeight) || 0)) body.style.minHeight = `${height}px`;
			}
			/** Whether this is the newest Turn, so a stale group cannot capture a new turn. */
			isLatestTurn(root, group) {
				const groupTurn = group.getAttribute("data-chat-turn");
				if (groupTurn === null) return false;
				let latest = Number.NEGATIVE_INFINITY;
				for (const element of root.querySelectorAll("[data-chat-turn]")) {
					const turn = Number(element.getAttribute("data-chat-turn"));
					if (Number.isFinite(turn) && turn > latest) latest = turn;
				}
				return Number(groupTurn) === latest;
			}
			schedule() {
				if (!this.active || this.frame !== null) return;
				this.frame = this.win.requestAnimationFrame(() => {
					this.frame = null;
					this.sync();
				});
			}
			onMutations(records) {
				for (const record of records) {
					if (record.type === "attributes") {
						const name = record.attributeName;
						if (name === null || !(record.target instanceof Element)) continue;
						if (name === "data-chat-running" || name === "data-chat-following-tail") {
							this.schedule();
							return;
						}
						if (!ATTRIBUTE_FILTER$1.includes(name)) continue;
						if (record.target.closest(GROUP_SELECTOR) !== null) {
							this.schedule();
							return;
						}
						continue;
					}
					if (record.type !== "childList") continue;
					const target = record.target instanceof Element ? record.target : record.target.parentElement;
					if (target === null) continue;
					if (target.closest("[data-open]") !== null && target.closest("[data-variant=\"think\"], [data-tool]") !== null) continue;
					if (target.closest(GROUP_CONTENT_SELECTOR) !== null || containsRunningRoot(record.addedNodes) || containsRunningRoot(record.removedNodes)) {
						this.schedule();
						return;
					}
				}
			}
			onClick = (event) => {
				if (this.autoClickDepth > 0) return;
				const target = event.target;
				if (!(target instanceof Element)) return;
				const disclosure = target.closest(DISCLOSURE_SELECTOR$1) ?? target.closest("[data-sample=\"bash\"][aria-expanded]");
				if (disclosure !== null && this.root?.contains(disclosure) === true) {
					const nestedControl = target.closest("a, button, input, textarea, select, [contenteditable=\"true\"]");
					if (nestedControl !== null && nestedControl !== disclosure) return;
					const key = disclosure.closest("[data-chat-flow-key]")?.getAttribute("data-chat-flow-key");
					if (key === null || key === void 0) return;
					this.manualRows.set(key, disclosure.getAttribute("aria-expanded") === "true" ? "closed" : "open");
					this.autoKeys.delete(key);
					return;
				}
				const group = target.closest(GROUP_SELECTOR);
				if (group === null || this.root?.contains(group) !== true) return;
				this.cancelOpenAnimation();
				const header = this.groupHeader(group);
				if (header === null || target !== header && !header.contains(target)) return;
				const key = group.getAttribute("data-chat-group-key");
				if (key === null) return;
				if (header.getAttribute("aria-expanded") === "true") {
					this.suppressedGroups.add(key);
					this.autoGroups.delete(key);
				} else {
					this.suppressedGroups.delete(key);
					this.autoGroups.delete(key);
				}
				if (event.detail > 0) this.win.queueMicrotask(() => {
					if (this.doc.activeElement === header) header.blur();
				});
			};
			/** Close the plugin's automatic rows and groups in non-active groups. */
			closeOtherWindows(active) {
				if (this.root === null) return;
				for (const group of this.root.querySelectorAll(GROUP_SELECTOR)) {
					if (group === active) continue;
					const snapshot = this.snapshot(group);
					if (snapshot !== null) {
						for (const candidate of snapshot.elements.values()) if (candidate.open && this.autoKeys.has(candidate.key) && candidate.manual !== "open" && candidate.element.isConnected) this.click(candidate.element);
						for (const candidate of snapshot.elements.values()) this.autoKeys.delete(candidate.key);
					}
					const key = group.getAttribute("data-chat-group-key");
					if (key !== null && this.autoGroups.has(key) && snapshot?.header.getAttribute("aria-expanded") === "true" && snapshot.header.isConnected) this.click(snapshot.header);
					if (key !== null) this.autoGroups.delete(key);
				}
			}
			/** Read one group's header and top-level reasoning/Tool disclosures. */
			snapshot(group) {
				const header = this.groupHeader(group);
				const key = group.getAttribute("data-chat-group-key");
				const content = group.querySelector(GROUP_CONTENT_SELECTOR);
				if (header === null || key === null || content === null) return null;
				const elements = /* @__PURE__ */ new Map();
				const candidates = [];
				let order = 0;
				for (const member of content.children) {
					if (member.nodeType !== 1) continue;
					const row = member;
					const flowKey = row.getAttribute("data-chat-flow-key");
					if (flowKey === null) continue;
					const kind = this.candidateKind(row);
					if (kind === void 0) continue;
					const bash = kind === "tool" ? row.querySelector("[data-sample=\"bash\"]") : null;
					const genericTool = kind === "tool" ? row.querySelector("[data-tool]") : null;
					const disclosure = kind === "reasoning" ? row.querySelector(DISCLOSURE_SELECTOR$1) : bash ?? genericTool?.querySelector(DISCLOSURE_SELECTOR$1) ?? null;
					if (disclosure === null) continue;
					const state = kind === "reasoning" ? row.querySelector("[data-variant=\"think\"]")?.getAttribute("data-state") : bash?.getAttribute("data-state") ?? genericTool?.getAttribute("data-state");
					const candidate = {
						key: flowKey,
						kind,
						order: order++,
						open: disclosure.getAttribute("aria-expanded") === "true",
						active: state === "running" || state === "preparing",
						auto: this.autoKeys.has(flowKey),
						manual: this.manualRows.get(flowKey),
						element: disclosure
					};
					elements.set(flowKey, candidate);
					const { element: _element, ...modelCandidate } = candidate;
					candidates.push(modelCandidate);
				}
				return {
					key,
					header,
					model: {
						open: header.getAttribute("aria-expanded") === "true",
						suppressed: this.suppressedGroups.has(key),
						candidates
					},
					elements
				};
			}
			candidateKind(row) {
				if (row.querySelector("[data-variant=\"think\"]") !== null) return "reasoning";
				if (row.querySelector("[data-tool], [data-sample=\"bash\"]") !== null) return "tool";
			}
			groupHeader(group) {
				return group.querySelector(":scope > div > button[aria-expanded]") ?? group.querySelector("button[aria-expanded]");
			}
			openRow(element) {
				openDisclosure(element, this.win, () => this.click(element));
			}
			closeRow(element) {
				return closeDisclosure(element, this.win, () => {
					if (this.active) this.click(element);
				}, this.pendingClose);
			}
			deferSync() {
				if (this.transitionTimer !== null) return;
				this.transitionTimer = this.win.setTimeout(() => {
					this.transitionTimer = null;
					this.sync();
				}, 210);
			}
			click(element) {
				const previous = this.doc.activeElement instanceof HTMLElement ? this.doc.activeElement : null;
				const focus = element.focus;
				element.focus = () => {};
				this.autoClickDepth += 1;
				try {
					element.click();
				} finally {
					this.autoClickDepth -= 1;
					element.focus = focus;
				}
				this.restoreFocus(element, previous);
				this.win.queueMicrotask(() => {
					this.restoreFocus(element, previous);
				});
			}
			restoreFocus(element, previous) {
				if (this.doc.activeElement !== element || previous === element) return;
				if (previous !== null && previous !== this.doc.body && previous.isConnected) previous.focus({ preventScroll: true });
				if (this.doc.activeElement === element) element.blur();
			}
			/**
			* Open the process group at full height with a short opacity fade.
			*
			* The window must not collapse to zero and re-expand; the outer transcript is
			* kept on the floor by its own guard while the group appears at its real size.
			*/
			autoOpen(header, group, key) {
				const body = group.querySelector("[data-step-process-body]");
				const reduced = typeof this.win.matchMedia === "function" && this.win.matchMedia("(prefers-reduced-motion: reduce)").matches;
				if (body === null || reduced) {
					this.click(header);
					this.autoGroups.add(key);
					this.pinOuterNow(group);
					return;
				}
				this.cancelOpenAnimation();
				const animation = {
					body,
					frame: null,
					timer: null,
					opacity: body.style.opacity,
					transition: body.style.transition
				};
				this.openAnimation = animation;
				this.startOuterGuard(group);
				body.style.opacity = "0";
				body.style.transition = `opacity ${OPEN_FADE_MS}ms ease-out`;
				this.click(header);
				this.autoGroups.add(key);
				this.pinOuterNow(group);
				animation.frame = this.win.requestAnimationFrame(() => {
					animation.frame = null;
					body.style.opacity = "1";
					animation.timer = this.win.setTimeout(() => this.finishOpenAnimation(animation), 210);
				});
			}
			finishOpenAnimation(animation) {
				if (this.openAnimation !== animation) return;
				if (animation.frame !== null) this.win.cancelAnimationFrame(animation.frame);
				if (animation.timer !== null) this.win.clearTimeout(animation.timer);
				animation.body.style.opacity = animation.opacity;
				animation.body.style.transition = animation.transition;
				this.openAnimation = null;
				this.stopOuterGuard();
			}
			cancelOpenAnimation() {
				const animation = this.openAnimation;
				if (animation === null) return;
				this.openAnimation = null;
				this.stopOuterGuard();
				if (animation.frame !== null) this.win.cancelAnimationFrame(animation.frame);
				if (animation.timer !== null) this.win.clearTimeout(animation.timer);
				animation.body.style.opacity = animation.opacity;
				animation.body.style.transition = animation.transition;
			}
			/** Close and forget every automatic open state. */
			resetWindow() {
				if (this.transitionTimer !== null) {
					this.win.clearTimeout(this.transitionTimer);
					this.transitionTimer = null;
				}
				this.cancelOpenAnimation();
				this.stopOuterGuard();
				this.detachFollow();
				if (this.root !== null) for (const group of this.root.querySelectorAll(GROUP_SELECTOR)) {
					const snapshot = this.snapshot(group);
					if (snapshot !== null) {
						for (const candidate of snapshot.elements.values()) if (candidate.open && this.autoKeys.has(candidate.key) && candidate.manual !== "open" && candidate.element.isConnected) this.click(candidate.element);
						const key = snapshot.key;
						if (snapshot.header.getAttribute("aria-expanded") === "true" && this.autoGroups.has(key) && snapshot.header.isConnected) this.click(snapshot.header);
					}
				}
				this.pendingClose.clear();
				this.autoKeys.clear();
				this.autoGroups.clear();
				this.suppressedGroups.clear();
				this.manualRows.clear();
				this.activeGroup = null;
			}
		};
		/** Whether a child-list change can add or remove the running status or a group. */
		function containsRunningRoot(nodes) {
			for (const node of nodes) {
				if (node.nodeType !== 1) continue;
				const element = node;
				if (element.matches(`${RUNNING_SELECTOR$1}, ${GROUP_SELECTOR}`) || element.querySelector(`${RUNNING_SELECTOR$1}, ${GROUP_SELECTOR}`) !== null) return true;
			}
			return false;
		}
		//#endregion
		//#region lib/types/client/pacing.js
		/** Frame-level pacing math shared by text reveal and window following. */
		/** Time used to catch up with newly arrived text; keeps latency near 100ms. */
		const CATCH_UP_MS = 100;
		const FRAME_MS = 1e3 / 60;
		/**
		* Reveal the next character slice on one animation frame.
		*
		* The step adapts to the backlog, so a normal chunk catches up in roughly six
		* frames while a large burst is spread over the same short interval instead of
		* appearing all at once. Surrogate pairs stay intact, avoiding one-frame
		* replacement glyphs for non-BMP text.
		*
		* @param current - currently revealed UTF-16 length.
		* @param target - complete text being revealed.
		* @param elapsedMs - elapsed frame time; clamped so a stalled frame does not dump a burst.
		* @returns the next revealed UTF-16 length.
		*/
		function nextRevealLength(current, target, elapsedMs = FRAME_MS) {
			if (current >= target.length) return target.length;
			const step = Math.max(1, Math.ceil((target.length - current) * Math.min(elapsedMs, 32) / CATCH_UP_MS - 1e-9));
			let next = Math.min(target.length, current + step);
			if (next < target.length && isHighSurrogate(target.charCodeAt(next - 1)) && isLowSurrogate(target.charCodeAt(next))) next += 1;
			return advanceGrapheme(target, next);
		}
		function advanceGrapheme(target, start) {
			let next = start;
			while (next < target.length) {
				const code = target.charCodeAt(next);
				if (isExtend(code) || code === 8205) {
					next += 1;
					continue;
				}
				if (target.charCodeAt(next - 1) === 8205) {
					next += isHighSurrogate(code) && isLowSurrogate(target.charCodeAt(next + 1)) ? 2 : 1;
					continue;
				}
				break;
			}
			return next;
		}
		function isExtend(code) {
			return code >= 768 && code <= 879 || code >= 6832 && code <= 6911 || code >= 7616 && code <= 7679 || code >= 8400 && code <= 8447 || code >= 65024 && code <= 65039 || code >= 65056 && code <= 65071 || code >= 127995 && code <= 127999 || code >= 917760 && code <= 917999;
		}
		function isHighSurrogate(code) {
			return code !== void 0 && code >= 55296 && code <= 56319;
		}
		function isLowSurrogate(code) {
			return code !== void 0 && code >= 56320 && code <= 57343;
		}
		//#endregion
		//#region lib/types/client/paced-body.js
		/**
		* Pace the live reasoning text into the official Content Factory.
		*
		* The source text remains the complete accumulated reasoning. Only the text
		* handed to the Markdown renderer is progressively revealed; when the block
		* settles, the full source is rendered immediately. This keeps the official
		* Markdown pipeline, labels, and any replacement Content Factory intact.
		*/
		const PacedReasoningBody = (0, react.memo)(function PacedReasoningBody({ text, running, renderFactorySlot, usePacing }) {
			const pacing = usePacing((value) => value);
			return renderFactorySlot("conversation.chat.reasoning.content", {
				text: usePacedText(text, running && pacing),
				running
			});
		});
		/**
		* Reveal appended reasoning over animation frames, not arrival chunks.
		*
		* Mounting shows the already-received text immediately; only subsequent
		* growth is paced, so expanding an older row never replays history. A
		* non-append replacement falls back to the complete text instead of animating
		* corrected content. Reduced-motion users always receive the full text.
		*
		* @param text - complete accumulated reasoning.
		* @param enabled - pace only while the block is streaming in Standard mode.
		* @returns the visible prefix handed to Markdown.
		*/
		function usePacedText(text, enabled) {
			const [visible, setVisible] = (0, react.useState)(text.length);
			const visibleRef = (0, react.useRef)(text.length);
			const targetRef = (0, react.useRef)(text);
			const previousRef = (0, react.useRef)(text);
			const frameRef = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				targetRef.current = text;
				if (!text.startsWith(previousRef.current)) {
					previousRef.current = text;
					visibleRef.current = text.length;
					setVisible(text.length);
					return;
				}
				previousRef.current = text;
				if (!enabled) {
					if (visibleRef.current !== text.length) {
						visibleRef.current = text.length;
						setVisible(text.length);
					}
					return;
				}
				if (text.length <= visibleRef.current) return;
				if (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches) {
					visibleRef.current = text.length;
					setVisible(text.length);
					return;
				}
				if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
				let previousTime = null;
				const tick = (time) => {
					frameRef.current = null;
					const target = targetRef.current;
					const current = visibleRef.current;
					if (current >= target.length) return;
					const elapsed = previousTime === null ? 1e3 / 60 : time - previousTime;
					previousTime = time;
					const next = nextRevealLength(current, target, elapsed);
					visibleRef.current = next;
					setVisible(next);
					if (next < target.length) frameRef.current = requestAnimationFrame(tick);
				};
				frameRef.current = requestAnimationFrame(tick);
				return () => {
					if (frameRef.current !== null) {
						cancelAnimationFrame(frameRef.current);
						frameRef.current = null;
					}
				};
			}, [text, enabled]);
			return text.slice(0, Math.min(visible, text.length));
		}
		//#endregion
		//#region lib/types/client/normal-smoothing.js
		const BLOCK_SELECTOR = "p,pre,ul,ol,li,table,blockquote,h1,h2,h3,h4,h5,h6,hr";
		/**
		* Line-edge fade for streaming Assistant prose.
		*
		* Normal assistant Markdown has no content Factory, so it cannot be paced
		* without duplicating Chat's renderer. A mask on the streaming root instead
		* softens the newest line while leaving the official renderer untouched.
		*/
		var NormalOutputSmoother = class {
			doc;
			win;
			active = false;
			observer = null;
			roots = /* @__PURE__ */ new Set();
			previous = /* @__PURE__ */ new WeakMap();
			animated = /* @__PURE__ */ new WeakSet();
			animations = /* @__PURE__ */ new Set();
			fade;
			/**
			* @param doc - document that owns the transcript.
			* @param win - window supplying MutationObserver.
			*/
			constructor(doc = document, win = window) {
				this.doc = doc;
				this.win = win;
				this.fade = new HighlightFade(doc, win, "dsh-stream-fade");
			}
			/** Observe streaming assistant roots. Idempotent. */
			start() {
				if (this.active) return;
				this.active = true;
				const body = this.doc.body;
				if (body !== null) {
					this.observer = new this.win.MutationObserver((records) => {
						if (records.some((record) => record.target instanceof Element && record.target.closest("[data-streaming]") !== null)) this.pinOuter();
						this.animateNewBlocks(records);
						this.reconcile();
					});
					this.observer.observe(body, {
						subtree: true,
						childList: true,
						attributes: true,
						attributeFilter: ["data-streaming"]
					});
				}
				this.reconcile();
			}
			/** Remove every mask and stop observing. */
			stop() {
				if (!this.active) return;
				this.active = false;
				this.observer?.disconnect();
				this.observer = null;
				for (const root of this.roots) this.clear(root);
				this.roots.clear();
				for (const animation of this.animations) animation.cancel();
				this.animations.clear();
				this.fade.stop();
			}
			/** Reconcile masks against the currently streaming Assistant roots. Public for tests. */
			sync() {
				this.reconcile();
			}
			pinOuter() {
				if (this.doc.querySelector("[data-chat-following-tail]") === null) return;
				const outer = this.doc.querySelector("[data-conversation-scroll]");
				if (outer === null) return;
				const floor = Math.max(0, outer.scrollHeight - outer.clientHeight);
				if (Math.abs(floor - outer.scrollTop) > .5) outer.scrollTop = floor;
			}
			animateNewBlocks(records) {
				for (const record of records) {
					if (record.type !== "childList" || record.addedNodes.length === 0) continue;
					for (const node of record.addedNodes) {
						if (node.nodeType !== 1) continue;
						const element = node;
						const blocks = element.matches(BLOCK_SELECTOR) ? [element] : [...element.querySelectorAll(BLOCK_SELECTOR)];
						for (const block of blocks) if (this.isStreamingBlock(block)) this.animateBlock(block);
					}
				}
			}
			isStreamingBlock(element) {
				return element.closest("[data-variant=\"think\"][data-state=\"running\"]") !== null || element.closest("[data-chat-flow-kind=\"assistant-step\"][data-chat-group-part=\"response\"] [data-streaming]") !== null;
			}
			animateBlock(element) {
				if (this.animated.has(element) || typeof element.animate !== "function") return;
				this.animated.add(element);
				const animation = element.animate([{ opacity: 0 }, { opacity: 1 }], {
					duration: 600,
					easing: "ease-in"
				});
				this.animations.add(animation);
				animation.addEventListener("finish", () => {
					this.animations.delete(animation);
				}, { once: true });
				animation.addEventListener("cancel", () => {
					this.animations.delete(animation);
				}, { once: true });
			}
			reconcile() {
				if (!this.active) return;
				const current = /* @__PURE__ */ new Set();
				for (const root of this.doc.querySelectorAll("[data-chat-flow-kind=\"assistant-step\"][data-chat-group-part=\"response\"] [data-streaming]")) current.add(root);
				for (const root of this.roots) if (!current.has(root) || !root.isConnected) this.clear(root);
				for (const root of current) {
					if (this.roots.has(root)) continue;
					this.roots.add(root);
					this.previous.set(root, {
						mask: root.style.getPropertyValue("mask-image"),
						webkit: root.style.getPropertyValue("-webkit-mask-image")
					});
					root.dataset.streamFade = "";
					this.fade.observe(root);
					const mask = "linear-gradient(to bottom, #000 calc(100% - 20px), rgba(0, 0, 0, 0.4) 100%)";
					root.style.setProperty("mask-image", mask);
					root.style.setProperty("-webkit-mask-image", mask);
				}
			}
			clear(root) {
				this.roots.delete(root);
				this.fade.unobserve(root);
				const previous = this.previous.get(root);
				delete root.dataset.streamFade;
				if (previous?.mask === void 0 || previous.mask === "") root.style.removeProperty("mask-image");
				else root.style.setProperty("mask-image", previous.mask);
				if (previous?.webkit === "" || previous?.webkit === void 0) root.style.removeProperty("-webkit-mask-image");
				else root.style.setProperty("-webkit-mask-image", previous.webkit);
			}
		};
		//#endregion
		//#region lib/types/client/flat-rows.js
		const FLOW_SELECTOR = "[data-chat-flow]:not([data-step-process-content])";
		const FLOW_SLOT_SELECTOR = "[data-slot=\"conversation.chat.flow\"]";
		const RUNNING_SELECTOR = "[data-chat-running]";
		const DISCLOSURE_SELECTOR = "[data-disclosure-row][aria-expanded]";
		const BASH_SELECTOR = "[data-sample=\"bash\"][aria-expanded]";
		const ATTRIBUTE_FILTER = [
			"aria-expanded",
			"data-chat-following-tail",
			"data-chat-running",
			"data-expanded",
			"data-state"
		];
		/**
		* Row-level enhancement for Detailed and Verbose Turns.
		*
		* Those modes intentionally render process rows flat, without a group body to
		* cap or scroll. This conductor only opens the current reasoning/tool rows and
		* respects the mode's collapse semantics: Detailed may fold older automatic
		* rows, Verbose never does.
		*/
		var FlatRowConductor = class {
			mode;
			doc;
			win;
			active = false;
			frame = null;
			observer = null;
			autoClickDepth = 0;
			autoKeys = /* @__PURE__ */ new Set();
			manualRows = /* @__PURE__ */ new Map();
			pendingClose = /* @__PURE__ */ new Set();
			transitionTimer = null;
			outer = null;
			outerIntent = false;
			outerGestureAt = 0;
			outerCheckTimer = null;
			/**
			* @param mode - Detailed or Verbose.
			* @param doc - document owning the transcript.
			* @param win - window supplying observers and animation frames.
			*/
			constructor(mode, doc = document, win = window) {
				this.mode = mode;
				this.doc = doc;
				this.win = win;
			}
			/** Start observing flat process rows. Idempotent. */
			start() {
				if (this.active) return;
				this.active = true;
				this.doc.addEventListener("click", this.onClick, true);
				const body = this.doc.body;
				if (body !== null) {
					this.observer = new this.win.MutationObserver((records) => {
						this.onMutations(records);
					});
					this.observer.observe(body, {
						subtree: true,
						childList: true,
						attributes: true,
						attributeFilter: [...ATTRIBUTE_FILTER]
					});
				}
				this.attachOuterFollow();
				this.sync();
			}
			/** Stop observing. Verbose rows that were opened stay open by design. */
			stop() {
				if (!this.active) return;
				this.active = false;
				this.doc.removeEventListener("click", this.onClick, true);
				this.observer?.disconnect();
				this.observer = null;
				if (this.frame !== null) {
					this.win.cancelAnimationFrame(this.frame);
					this.frame = null;
				}
				if (this.transitionTimer !== null) {
					this.win.clearTimeout(this.transitionTimer);
					this.transitionTimer = null;
				}
				this.detachOuterFollow();
				this.pendingClose.clear();
				this.autoKeys.clear();
				this.manualRows.clear();
			}
			/** Reconcile the newest Turn's flat rows. Public for tests. */
			sync() {
				if (!this.active || this.transitionTimer !== null) return;
				const running = this.doc.querySelector(RUNNING_SELECTOR);
				if (running === null) return;
				const flow = running.closest(FLOW_SELECTOR);
				if (flow === null) return;
				const slot = flow.querySelector(FLOW_SLOT_SELECTOR) ?? flow;
				let latest = Number.NEGATIVE_INFINITY;
				for (const element of slot.querySelectorAll("[data-chat-turn]")) {
					const turn = Number(element.getAttribute("data-chat-turn"));
					if (Number.isFinite(turn) && turn > latest) latest = turn;
				}
				if (!Number.isFinite(latest)) return;
				const rows = [...slot.querySelectorAll("[data-chat-flow-kind]")].filter((row) => Number(row.getAttribute("data-chat-turn")) === latest);
				const elements = /* @__PURE__ */ new Map();
				const candidates = [];
				let order = 0;
				for (const row of rows) {
					const candidate = this.candidate(row, order++);
					if (candidate === void 0) continue;
					elements.set(candidate.key, candidate);
					const { element: _element, ...model } = candidate;
					candidates.push(model);
				}
				const decision = decideWindow({
					open: true,
					suppressed: false,
					candidates
				});
				const opens = decision.open.map((key) => elements.get(key)).filter((candidate) => candidate !== void 0 && !candidate.open && candidate.element.isConnected);
				let closeAnimated = false;
				if (this.mode === "detailed") for (const key of decision.close) {
					const candidate = elements.get(key);
					if (candidate === void 0 || !candidate.open || !candidate.element.isConnected) continue;
					if (this.closeRow(candidate.element)) closeAnimated = true;
					this.autoKeys.delete(key);
				}
				if (closeAnimated && opens.length > 0) {
					this.deferSync();
					return;
				}
				for (const candidate of opens) {
					this.openRow(candidate.element);
					this.autoKeys.add(candidate.key);
				}
				this.scheduleOuterCheck();
			}
			attachOuterFollow() {
				const outer = this.doc.querySelector("[data-conversation-scroll]");
				if (outer === null || outer === this.outer) return;
				this.detachOuterFollow();
				this.outer = outer;
				this.outerIntent = this.doc.querySelector("[data-chat-following-tail]") !== null || this.nearBottom(outer);
				outer.addEventListener("scroll", this.onOuterScroll, { passive: true });
				outer.addEventListener("scrollend", this.onOuterScrollEnd);
				for (const type of [
					"wheel",
					"touchstart",
					"pointerdown",
					"keydown"
				]) outer.addEventListener(type, this.onOuterGesture, {
					passive: true,
					capture: true
				});
			}
			detachOuterFollow() {
				const outer = this.outer;
				if (outer !== null) {
					outer.removeEventListener("scroll", this.onOuterScroll);
					outer.removeEventListener("scrollend", this.onOuterScrollEnd);
					for (const type of [
						"wheel",
						"touchstart",
						"pointerdown",
						"keydown"
					]) outer.removeEventListener(type, this.onOuterGesture, true);
				}
				this.outer = null;
				this.outerIntent = false;
				if (this.outerCheckTimer !== null) {
					this.win.clearTimeout(this.outerCheckTimer);
					this.outerCheckTimer = null;
				}
			}
			nearBottom(element) {
				return Math.max(0, element.scrollHeight - element.clientHeight) - element.scrollTop <= 2;
			}
			onOuterGesture = () => {
				this.outerGestureAt = this.win.Date.now();
			};
			onOuterScroll = () => {
				const outer = this.outer;
				if (outer === null) return;
				if (this.nearBottom(outer)) this.outerIntent = true;
				else if (this.win.Date.now() - this.outerGestureAt < 1200) this.outerIntent = false;
			};
			onOuterScrollEnd = () => {
				this.scheduleOuterCheck(0);
			};
			scheduleOuterCheck(delay = 350) {
				if (!this.outerIntent || this.outerCheckTimer !== null) return;
				this.outerCheckTimer = this.win.setTimeout(() => {
					this.outerCheckTimer = null;
					const outer = this.outer;
					if (outer === null || !outer.isConnected || !this.outerIntent) return;
					if (this.win.Date.now() - this.outerGestureAt < 1e3) return;
					const floor = Math.max(0, outer.scrollHeight - outer.clientHeight);
					if (floor - outer.scrollTop <= 1) return;
					outer.scrollTop = floor;
					outer.dispatchEvent(new Event("scroll"));
					this.win.requestAnimationFrame(() => {
						if (outer.isConnected) outer.dispatchEvent(new Event("scrollend"));
					});
				}, delay);
			}
			deferSync() {
				if (this.transitionTimer !== null) return;
				this.transitionTimer = this.win.setTimeout(() => {
					this.transitionTimer = null;
					this.sync();
				}, 210);
			}
			candidate(row, order) {
				const key = row.getAttribute("data-chat-flow-key");
				if (key === null) return void 0;
				const thinking = row.querySelector("[data-variant=\"think\"]");
				const bash = row.querySelector("[data-sample=\"bash\"]");
				const tool = row.querySelector("[data-tool]");
				const kind = thinking !== null ? "reasoning" : bash !== null || tool !== null ? "tool" : void 0;
				if (kind === void 0) return void 0;
				const disclosure = kind === "reasoning" ? thinking?.querySelector(DISCLOSURE_SELECTOR) : bash ?? tool?.querySelector(DISCLOSURE_SELECTOR);
				if (disclosure === null || disclosure === void 0) return void 0;
				const state = kind === "reasoning" ? thinking?.getAttribute("data-state") : bash?.getAttribute("data-state") ?? tool?.getAttribute("data-state");
				return {
					key,
					kind,
					order,
					open: disclosure.getAttribute("aria-expanded") === "true",
					active: state === "running" || state === "preparing",
					auto: this.autoKeys.has(key),
					manual: this.manualRows.get(key),
					element: disclosure
				};
			}
			schedule() {
				if (!this.active || this.frame !== null) return;
				this.frame = this.win.requestAnimationFrame(() => {
					this.frame = null;
					this.sync();
				});
			}
			onMutations(records) {
				for (const record of records) {
					const target = record.target instanceof Element ? record.target : record.target.parentElement;
					if (target === null) continue;
					if (record.type === "attributes") {
						const name = record.attributeName;
						if (name === "data-chat-running" || name === "data-chat-following-tail") {
							this.schedule();
							return;
						}
						if (name !== null && ATTRIBUTE_FILTER.includes(name) && target.closest("[data-chat-flow]") !== null) {
							this.schedule();
							return;
						}
						continue;
					}
					if (record.type === "childList" && target.closest("[data-chat-flow]") !== null) {
						if (target.closest("[data-open]") !== null) continue;
						this.scheduleOuterCheck();
						this.schedule();
						return;
					}
				}
			}
			onClick = (event) => {
				if (this.autoClickDepth > 0) return;
				const target = event.target;
				if (!(target instanceof Element)) return;
				const disclosure = target.closest(DISCLOSURE_SELECTOR) ?? target.closest(BASH_SELECTOR);
				if (disclosure === null) return;
				const key = disclosure.closest("[data-chat-flow-key]")?.getAttribute("data-chat-flow-key");
				if (key === null || key === void 0) return;
				this.manualRows.set(key, disclosure.getAttribute("aria-expanded") === "true" ? "closed" : "open");
				this.autoKeys.delete(key);
			};
			openRow(element) {
				openDisclosure(element, this.win, () => this.click(element));
			}
			closeRow(element) {
				return closeDisclosure(element, this.win, () => {
					if (this.active) this.click(element);
				}, this.pendingClose);
			}
			click(element) {
				const previous = this.doc.activeElement instanceof HTMLElement ? this.doc.activeElement : null;
				const focus = element.focus;
				element.focus = () => {};
				this.autoClickDepth += 1;
				try {
					element.click();
				} finally {
					this.autoClickDepth -= 1;
					element.focus = focus;
				}
				if (this.doc.activeElement !== element || previous === element) return;
				if (previous !== null && previous !== this.doc.body && previous.isConnected) previous.focus({ preventScroll: true });
				if (this.doc.activeElement === element) element.blur();
			}
		};
		//#endregion
		//#region lib/types/client/mode-policy.js
		/**
		* Resolve a saved or absent work-details mode with Chat's compatibility rules.
		*
		* @param saved - raw `ui-chat.transcriptView` value.
		* @param desktop - whether the client is the Desktop shell.
		* @returns the enhanced mode, or null for an unavailable setting snapshot.
		*/
		function resolveMode(saved, desktop) {
			if (saved === "compact" || saved === "standard" || saved === "detailed" || saved === "verbose") return saved;
			if (saved === "normal" || saved === "expanded") return "detailed";
			return desktop ? "standard" : "detailed";
		}
		/** Pick the process representation the official mode renders. */
		function conductorFor(mode) {
			return mode === "compact" || mode === "standard" ? "grouped" : "flat";
		}
		//#endregion
		//#region lib/types/client/index.js
		/** Required services: shared Settings forms and the Slot registry. */
		const inject = ["configForms", "slots"];
		/**
		* Mount the mode-appropriate row conductor, the paced reasoning renderer, and
		* the normal-output smoother. Settings not yet accepted start nothing.
		* @param ctx - Client root context.
		*/
		function apply(ctx) {
			const pacing = (0, _deepseek_ai_dsh_client_store.createSnapshotStore)(false);
			ctx.slots.inject("conversation.chat.reasoning.body", () => ctx.slots.register({
				name: "conversation.chat.reasoning.body",
				priority: 10,
				inject: () => ({ hooks: { pacing } })
			}, PacedReasoningBody));
			const form = ctx.configForms.get("ui-chat");
			let conductor = null;
			let flat = null;
			let smoother = null;
			const reconcile = () => {
				const mode = resolveConfiguredMode(form.getSnapshot());
				pacing.set(mode !== null);
				const grouped = mode !== null && conductorFor(mode) === "grouped";
				const flatMode = mode === "detailed" || mode === "verbose";
				if (grouped && conductor === null) {
					conductor = new StreamWindowConductor();
					conductor.start();
				} else if (!grouped && conductor !== null) {
					conductor.stop();
					conductor = null;
				}
				if (flatMode && flat === null) {
					flat = new FlatRowConductor(mode);
					flat.start();
				} else if (!flatMode && flat !== null) {
					flat.stop();
					flat = null;
				}
				if (mode !== null && smoother === null) {
					smoother = new NormalOutputSmoother();
					smoother.start();
				} else if (mode === null && smoother !== null) {
					smoother.stop();
					smoother = null;
				}
			};
			ctx.effect(() => {
				const unsubscribe = form.subscribe(reconcile);
				reconcile();
				return () => {
					unsubscribe();
					conductor?.stop();
					conductor = null;
					smoother?.stop();
					smoother = null;
					flat?.stop();
					flat = null;
				};
			}, "stream-focus: mode conductors");
		}
		/** Resolve the configured mode, or null while the settings snapshot is not ready. */
		function resolveConfiguredMode(snapshot) {
			if (snapshot.status === "loading") return null;
			return resolveMode(snapshot.value?.transcriptView, "dshDesktop" in globalThis);
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map