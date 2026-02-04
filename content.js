/**
 * NPTEL Attendance Autofill
 * Developed by Atul Prakash (@berealatul)
 * License: MIT
 */

// Format date from DD-MM-YYYY to YYYY-MM-DD
function formatDateForInput(dateStr) {
  const parts = dateStr.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (parts) {
    return `${parts[3]}-${parts[2]}-${parts[1]}`;
  }
  return dateStr;
}

// Locate the container for a specific question text in Google Forms
function getContainer(question) {
  const term = question.toLowerCase();
  // Google Forms uses role="heading" for question titles
  const headings = document.querySelectorAll('div[role="heading"]');

  for (const h of headings) {
    if (h.innerText && h.innerText.toLowerCase().includes(term)) {
      // Typically, the question is inside a listitem container
      let container = h.closest('[role="listitem"]');

      // Fallback: simple parent traversal if structure changes
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

// Trigger mouse events properly for Google Forms interactions
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

// Fill text or date inputs
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
      // Dispatch necessary events to ensure Google Forms saves the data
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      input.blur();
    }
  }
}

// Handle Google Forms custom listbox dropdowns
function fillDropdown(question, value) {
  if (!value) return;
  const container = getContainer(question);

  if (container) {
    const listbox = container.querySelector('div[role="listbox"]');
    if (listbox) {
      // Check if the value is already selected (via aria-selected or display text)
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
        // Fallback check for collapsed text
        const displayArea = listbox.querySelector('div[jsname="d9BH4c"]');
        if (displayArea && displayArea.innerText.includes(value)) {
          return;
        }
      }

      // Open the dropdown if not expanded
      const isExpanded = listbox.getAttribute("aria-expanded") === "true";
      if (!isExpanded) {
        triggerClick(listbox);
      }

      // Poll briefly for options to appear (they may render in a portal)
      let attempts = 0;
      const clickOption = () => {
        attempts++;
        // Check local children first, then global document for portals
        let options = Array.from(
          listbox.querySelectorAll('div[role="option"]'),
        );
        if (options.length < 2) {
          options = Array.from(document.querySelectorAll('div[role="option"]'));
        }

        for (const opt of options) {
          if (opt.dataset.value === value || opt.innerText.trim() === value) {
            // Ensure we click the actual list item, not the display header
            const parent = opt.parentElement;
            if (
              parent &&
              parent.querySelectorAll('div[role="option"]').length > 1
            ) {
              triggerClick(opt);
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

// Main execution function
function runAutofill() {
  chrome.storage.sync.get(null, (data) => {
    if (chrome.runtime.lastError) {
      // Silently fail if storage is not accessible (e.g. context invalid)
      return;
    }

    // User-configured fields
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

// Retry loop to handle network latency and dynamic DOM rendering
let attempts = 0;
const intervalId = setInterval(() => {
  runAutofill();
  attempts++;
  if (attempts > 10) {
    clearInterval(intervalId);
  }
}, 1000);
