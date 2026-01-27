// Improved content.js
// Handles finding questions more robustly by traversing DOM structure
// Retries filling to handle dynamic loading

// Helper: Convert DD-MM-YYYY to YYYY-MM-DD
function formatDateForInput(dateStr) {
  const parts = dateStr.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (parts) {
    return `${parts[3]}-${parts[2]}-${parts[1]}`;
  }
  return dateStr;
}

function getContainer(question) {
  const term = question.toLowerCase();
  const headings = document.querySelectorAll('div[role="heading"]');
  for (const h of headings) {
    if (h.innerText && h.innerText.toLowerCase().includes(term)) {
      let container = h.closest('[role="listitem"]');
      if (!container) {
        let parent = h.parentElement;
        for (let i = 0; i < 5 && parent; i++) {
          if (parent.querySelector('input, textarea, div[role="listbox"]')) {
            container = parent;
            break;
          }
          parent = parent.parentElement;
        }
      }
      return container;
    }
  }
  return null;
}

function fillByQuestion(question, value, isDate = false) {
  if (!value) return;
  const container = getContainer(question);
  if (container) {
    const input = container.querySelector(
      "input:not([type='hidden']), textarea",
    );
    if (input) {
      let finalValue = value;
      if (isDate && input.type === "date") {
        finalValue = formatDateForInput(value);
      }

      if (input.value === finalValue) return;

      input.focus();
      input.value = finalValue;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      input.blur();
      console.log(`[Autofill] Filled '${question}' with '${finalValue}'`);
    }
  }
}

function triggerClick(element) {
  const events = ["mousedown", "mouseup", "click"];
  events.forEach((eventType) => {
    const event = new MouseEvent(eventType, {
      bubbles: true,
      cancelable: true,
      view: window,
    });
    element.dispatchEvent(event);
  });
}

function fillDropdown(question, value) {
  if (!value) return;
  const container = getContainer(question);
  if (container) {
    const listbox = container.querySelector('div[role="listbox"]');
    if (listbox) {
      // Check if already selected by looking for visible text in the box or specific Google Forms structure
      // Google Forms usually separates the display value from the options list.
      // We check the listbox's visible text (collapsed state)
      // OR check if any option inside marked as selected matches.

      // Refined check:
      // 1. Check visible text in the listbox container (simple, covers most cases)
      // 2. Be careful not to match "Virtual" if it's just an option in the list but not selected.
      // When closed, usually only selected value is visible/rendered in the main box.

      // However, listbox.innerText might include all options if they are just hidden with opacity/off-screen.
      // Better check: Look for the specific structure 'aria-selected="true"' options.
      const selectedOption = listbox.querySelector(
        'div[role="option"][aria-selected="true"]',
      );

      if (selectedOption) {
        if (
          selectedOption.dataset.value === value ||
          selectedOption.innerText.trim() === value
        ) {
          return; // Already selected
        }
      } else {
        // Fallback: checks specific display container if usually present
        const displayArea = listbox.querySelector('div[jsname="d9BH4c"]'); // from user snippet
        if (displayArea && displayArea.innerText.includes(value)) {
          // Verify it's not just "Choose" or something
          // If it matches exactly or contains heavily implies selection if closed.
          return;
        }
      }

      // Avoid rapid re-clicking if it's already open, but hard to know 100% state without aria-expanded
      // Google Forms uses aria-expanded.
      const isExpanded = listbox.getAttribute("aria-expanded") === "true";

      if (!isExpanded) {
        triggerClick(listbox);
      }

      // Poll for options to appear
      let attempts = 0;
      const clickOption = () => {
        attempts++;
        // Search for options.
        // They might be children of listbox OR attached to body (portals)
        // We'll search both scopes.
        let options = Array.from(
          listbox.querySelectorAll('div[role="option"]'),
        );

        // If we don't find enough options inside, checks global document (for portals)
        if (options.length < 2) {
          options = Array.from(document.querySelectorAll('div[role="option"]'));
        }

        for (const opt of options) {
          // Match value or text
          if (opt.dataset.value === value || opt.innerText.trim() === value) {
            // Ensure we are clicking an Item in the list, not the one in the display box (if duplication exists)
            // In Google Forms, the list options usually share a container.
            const parent = opt.parentElement;
            // Simple heuristic: Does parent have multiple 'option' children?
            if (
              parent &&
              parent.querySelectorAll('div[role="option"]').length > 1
            ) {
              triggerClick(opt);
              console.log(`[Autofill] Selected '${value}' for '${question}'`);
              return true; // Success
            }
          }
        }
        return false;
      };

      const pollId = setInterval(() => {
        if (clickOption() || attempts > 10) {
          clearInterval(pollId);
        }
      }, 200);
    }
  }
}

function runAutofill() {
  chrome.storage.sync.get(null, (data) => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError);
      return;
    }

    fillByQuestion("Internship ID", data.internshipId);
    fillByQuestion("Your Name", data.name);
    fillByQuestion("Mobile Number", data.mobile);

    // Fixed / Hardcoded fields
    fillByQuestion("Institute offering", "IIT Ropar");
    fillByQuestion("Internship offering Professor", "Prof. Sudarshan Iyengar");
    fillByQuestion("Internship start date", "14-01-2026", true);
    fillByQuestion("Internship end date", "24-03-2026", true);

    // Dropdowns
    fillDropdown("Mode of Internship", "Virtual");
    fillDropdown("Duration of Internship", "10 weeks");
  });
}

let attempts = 0;
const intervalId = setInterval(() => {
  runAutofill();
  attempts++;
  if (attempts > 10) {
    clearInterval(intervalId);
  }
}, 1000);
