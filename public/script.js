document.addEventListener("DOMContentLoaded", () => {
  // ===== DOM Elements =====
  const themeToggleBtn = document.getElementById("theme-toggle");
  const uploadInput = document.getElementById("upload");
  const profileImage = document.getElementById("dashboardProfileImage");
  const phoneInput = document.getElementById("phone");
  const submitButton = document.getElementById("submit-button");
  const clearBtn = document.getElementById("clearBtn");
  const exportBtn = document.getElementById("exportBtn");
  const copyAllBtn = document.getElementById("copyAllBtn");
  const resultDiv = document.getElementById("result");
  const resultsHeader = document.getElementById("resultsHeader");
  const resultsCount = document.getElementById("resultsCount");
  const toastContainer = document.getElementById("toastContainer");
  
  // API Status Elements
  const simApiBadge = document.getElementById("simApiBadge");
  const truecallerApiBadge = document.getElementById("truecallerApiBadge");
  
  // ===== DOM Elements (Truecaller) =====
  const truecallerBtn = document.getElementById("truecallerBtn");
  const truecallerModal = document.getElementById("truecallerModal");
  const closeTcModal = document.getElementById("closeTcModal");
  const tcNameDisplay = document.getElementById("tcNameDisplay");
  const tcSimDisplay = document.getElementById("tcSimDisplay");
  const tcLoadingState = document.getElementById("tcLoadingState");
  const tcResultContent = document.getElementById("tcResultContent");
  const tcErrorState = document.getElementById("tcErrorState");
  
  // ===== App State =====
  let searchResults = [];
  let currentTheme = localStorage.getItem("theme") || "light";
  let isSearching = false;
  
  const MAIN_API = "/api/lookup";
  const TRUECALLER_API = "/api/truecaller?number=";
  
  // ===== Event Listeners =====
  themeToggleBtn.addEventListener("click", toggleTheme);
  uploadInput.addEventListener("change", previewImage);
  submitButton.addEventListener("click", performSearch);
  clearBtn.addEventListener("click", clearResults);
  exportBtn.addEventListener("click", exportResults);
  copyAllBtn.addEventListener("click", copyAllResults);
  truecallerBtn.addEventListener("click", performTruecallerSearch);
  
  phoneInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") performSearch();
  });
  
  // Modal Close Listeners
  closeTcModal.addEventListener("click", () => {
    truecallerModal.style.display = "none";
    resetTruecallerModal();
  });
  
  window.addEventListener("click", (e) => {
    if (e.target === truecallerModal) {
      truecallerModal.style.display = "none";
      resetTruecallerModal();
    }
  });
  
  // Event delegation for copy buttons
  resultDiv.addEventListener("click", (event) => {
    if (event.target.closest(".copy-btn")) {
      const button = event.target.closest(".copy-btn");
      const index = parseInt(button.dataset.index);
      copySingleResult(index);
    }
  });
  
  // ===== Initialize App =====
  if (currentTheme === "dark") {
    document.body.classList.add("dark");
    themeToggleBtn.textContent = "☀️";
  }
  
  // Check APIs status on startup
  checkAPIsStatus();
  
  // ===== Functions =====
  
  function toggleTheme() {
    document.body.classList.toggle("dark");
    const isDark = document.body.classList.contains("dark");
    themeToggleBtn.textContent = isDark ? "☀️" : "🌙";
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }
  
  function previewImage(event) {
    const reader = new FileReader();
    reader.onload = () => {
      profileImage.src = reader.result;
      showToast("success", "Profile Updated", "Profile image has been updated!");
    };
    if (event.target.files[0]) {
      reader.readAsDataURL(event.target.files[0]);
    }
  }
  
  function resetTruecallerModal() {
    tcLoadingState.style.display = "none";
    tcResultContent.style.display = "none";
    tcErrorState.style.display = "none";
  }
  
  function showTruecallerLoading() {
    tcLoadingState.style.display = "flex";
    tcResultContent.style.display = "none";
    tcErrorState.style.display = "none";
  }
  
  function showTruecallerResult(name, sim) {
    tcLoadingState.style.display = "none";
    tcResultContent.style.display = "block";
    tcErrorState.style.display = "none";
    
    tcNameDisplay.textContent = name;
    tcSimDisplay.textContent = sim;
    
    // Set appropriate color
    if (name.includes("N/A") || name.includes("Not Available") || name === "---") {
        tcNameDisplay.style.color = "var(--warning)";
    } else {
        tcNameDisplay.style.color = "var(--primary)";
    }
  }
  
  function showTruecallerError() {
    tcLoadingState.style.display = "none";
    tcResultContent.style.display = "none";
    tcErrorState.style.display = "block";
  }
  
  async function checkAPIsStatus() {
    // Test SIM/CNIC API
    try {
      const simResponse = await fetchWithTimeout(`${MAIN_API}?query=03001234567`, 5000, {
        headers: { 'x-requested-with': 'XMLHttpRequest' }
      });
      
      if (simResponse.ok) {
        simApiBadge.innerHTML = '<i class="fas fa-circle-check"></i> SIM/CNIC';
        simApiBadge.className = "api-badge active";
      } else {
        simApiBadge.innerHTML = '<i class="fas fa-circle-xmark"></i> SIM/CNIC';
        simApiBadge.className = "api-badge inactive";
      }
    } catch {
      simApiBadge.innerHTML = '<i class="fas fa-circle-xmark"></i> SIM/CNIC';
      simApiBadge.className = "api-badge inactive";
    }
    
    // Test Truecaller API
    try {
      const tcResponse = await fetchWithTimeout(`${TRUECALLER_API}923001234567`, 5000, {
        headers: { 'x-requested-with': 'XMLHttpRequest' }
      });
      
      if (tcResponse.ok) {
        truecallerApiBadge.innerHTML = '<i class="fas fa-circle-check"></i> Truecaller';
        truecallerApiBadge.className = "api-badge active";
      } else {
        truecallerApiBadge.innerHTML = '<i class="fas fa-circle-xmark"></i> Truecaller';
        truecallerApiBadge.className = "api-badge inactive";
      }
    } catch {
      truecallerApiBadge.innerHTML = '<i class="fas fa-circle-xmark"></i> Truecaller';
      truecallerApiBadge.className = "api-badge inactive";
    }
  }
  
  async function performSearch() {
    const query = phoneInput.value.trim();
    
    if (!query) {
      showToast("error", "Empty Input", "Please enter a phone number or CNIC");
      phoneInput.focus();
      return;
    }
    
    const cleanQuery = query.replace(/\D/g, "");
    if (!/^(\d{10,13})$/.test(cleanQuery)) {
      showToast("error", "Invalid Format", "Please enter a valid 10-13 digit number or CNIC");
      phoneInput.focus();
      return;
    }
    
    // Check if SIM API is active
    if (simApiBadge.classList.contains("inactive")) {
      showToast("error", "API Offline", "SIM/CNIC API is currently unavailable");
      return;
    }
    
    // Set searching state
    isSearching = true;
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Searching...';
    
    // Show loading state
    resultDiv.innerHTML = `
      <div class="loading-state">
        <div class="loading-icon">
          <i class="fas fa-spinner fa-spin"></i>
        </div>
        <h3 class="state-title">Searching Database</h3>
        <p class="state-message">
          Querying for: ${cleanQuery}<br>
          Please wait...
        </p>
      </div>
    `;
    
    resultsHeader.style.display = "none";
    
    try {
      // Query API
      const results = await queryAPI(cleanQuery);
      searchResults = results;
      
      // Display results
      if (results.length > 0) {
        phoneInput.value = ""; // Clear input on success
        displayResults(results);
        showToast("success", "Search Complete", `Found ${results.length} record(s)`);
      } else {
        displayNoResults();
        showToast("warning", "No Results", `No records found for ${cleanQuery}`);
      }
      
    } catch (error) {
      console.error("Search error:", error);
      displayError(error);
      showToast("error", "Search Failed", "An error occurred during search");
    } finally {
      isSearching = false;
      submitButton.disabled = false;
      submitButton.innerHTML = '<i class="fas fa-search"></i> Search Database';
    }
  }
  
  async function queryAPI(query) {
    const response = await fetchWithTimeout(`${MAIN_API}?query=${encodeURIComponent(query)}`, 15000, {
      headers: { 'x-requested-with': 'XMLHttpRequest' }
    });
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }
    
    const data = await response.json();
    return processAPIResponse(data);
  }
  
  function processAPIResponse(data) {
    const results = [];
    
    // Check if this is a post-2022 warning
    if (data.results_count === 1 && data.results[0].mobile && 
        data.results[0].mobile.includes("This Number/Cnic Registered After 2022")) {
      return [];
    }
    
    // Process normal results
    if (data.results && data.results.length > 0) {
      data.results.forEach(record => {
        // Skip post-2022 warning entries
        if (record.mobile && record.mobile.includes("This Number/Cnic Registered After 2022")) {
          return;
        }
        
        results.push({
          mobile: formatPhoneNumber(record.mobile || ""),
          name: record.name || "N/A",
          cnic: record.cnic || "N/A",
          address: record.address || "N/A",
          source: "SIM/CNIC Database"
        });
      });
    }
    
    return results;
  }
  
  function formatPhoneNumber(number) {
    if (!number) return "N/A";
    const clean = number.toString().replace(/\D/g, "");
    if (clean.length === 10 && !clean.startsWith("0")) {
      return "0" + clean;
    }
    return clean.length >= 10 ? clean : number;
  }
  
  function displayResults(results) {
    resultsCount.textContent = `${results.length} record(s) found`;
    resultsHeader.style.display = "flex";
    
    let html = "";
    
    // Check if we need to show post-2022 warning
    const query = phoneInput.value.trim().replace(/\D/g, "");
    fetch(`${MAIN_API}?query=${encodeURIComponent(query)}`, {
      headers: { 'x-requested-with': 'XMLHttpRequest' }
    })
      .then(res => res.json())
      .then(data => {
        if (data.results_count === 1 && data.results[0].mobile && 
            data.results[0].mobile.includes("This Number/Cnic Registered After 2022")) {
          
          html += `
            <div class="warning-message">
              <div class="warning-icon">
                <i class="fas fa-exclamation-triangle"></i>
              </div>
              <div class="warning-title">Post-2022 Registration</div>
              <div class="warning-text">This Number/Cnic Registered After 2022</div>
            </div>
          `;
        }
      })
      .catch(() => {})
      .finally(() => {
        // Add normal results
        results.forEach((result, index) => {
          html += `
            <div class="sim-card">
              <div class="sim-header">
                <div class="result-network">Database</div>
                <button class="copy-btn" data-index="${index}" title="Copy Details">
                  <i class="far fa-copy"></i>
                </button>
              </div>
              
              <div class="result-detail">
                <div class="detail-icon"><i class="fas fa-sim-card"></i></div>
                <div class="detail-label">Mobile:</div>
                <div class="detail-value" style="font-weight: 700;">${result.mobile}</div>
              </div>
              
              <div class="result-detail">
                <div class="detail-icon"><i class="fas fa-user"></i></div>
                <div class="detail-label">Name:</div>
                <div class="detail-value">${result.name}</div>
              </div>
              
              <div class="result-detail">
                <div class="detail-icon"><i class="fas fa-id-card"></i></div>
                <div class="detail-label">CNIC:</div>
                <div class="detail-value">${result.cnic}</div>
              </div>
              
              <div class="result-detail">
                <div class="detail-icon"><i class="fas fa-map-marker-alt"></i></div>
                <div class="detail-label">Address:</div>
                <div class="detail-value">${result.address || "Not Available"}</div>
              </div>
              
              <div class="result-source">
                <i class="fas fa-database"></i> Source: ${result.source}
              </div>
            </div>
          `;
        });
        
        resultDiv.innerHTML = html;
      });
  }
  
  function displayNoResults() {
    resultsCount.textContent = "0 records found";
    resultsHeader.style.display = "none";
    
    const query = phoneInput.value.trim().replace(/\D/g, "");
    fetch(`${MAIN_API}?query=${encodeURIComponent(query)}`, {
      headers: { 'x-requested-with': 'XMLHttpRequest' }
    })
      .then(res => res.json())
      .then(data => {
        if (data.results_count === 1 && data.results[0].mobile && 
            data.results[0].mobile.includes("This Number/Cnic Registered After 2022")) {
          
          resultDiv.innerHTML = `
            <div class="warning-message">
              <div class="warning-icon">
                <i class="fas fa-exclamation-triangle"></i>
              </div>
              <div class="warning-title">Post-2022 Registration</div>
              <div class="warning-text">This Number/Cnic Registered After 2022</div>
            </div>
            <div class="empty-state">
              <div class="empty-icon">
                <i class="fas fa-search"></i>
              </div>
              <h3 class="state-title">No SIM Data Found</h3>
              <p class="state-message">
                This number/CNIC is registered after 2022.<br>
                Database contains only pre-2022 registrations.
              </p>
            </div>
          `;
        } else {
          resultDiv.innerHTML = `
            <div class="empty-state">
              <div class="empty-icon">
                <i class="fas fa-search"></i>
              </div>
              <h3 class="state-title">No Results Found</h3>
              <p class="state-message">
                No SIM data found for the entered query.<br>
                Please try a different phone number or CNIC.
              </p>
            </div>
          `;
        }
      })
      .catch(() => {
        resultDiv.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">
              <i class="fas fa-search"></i>
            </div>
            <h3 class="state-title">No Results Found</h3>
            <p class="state-message">
              No SIM data found for the entered query.<br>
              Please try a different phone number or CNIC.
            </p>
          </div>
        `;
      });
  }
  
  function displayError(error) {
    resultsCount.textContent = "Error";
    resultsHeader.style.display = "none";
    
    resultDiv.innerHTML = `
      <div class="error-state">
        <div class="error-icon">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        <h3 class="state-title">Search Error</h3>
        <p class="state-message">
          ${error.message || "An unknown error occurred"}<br>
          Please check your connection and try again.
        </p>
        <button class="btn btn-primary" onclick="location.reload()" style="margin-top: 20px;">
          <i class="fas fa-redo"></i> Reload Page
        </button>
      </div>
    `;
  }
  
  function clearResults() {
    phoneInput.value = "";
    searchResults = [];
    resultsCount.textContent = "0 records found";
    resultsHeader.style.display = "none";
    
    resultDiv.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <i class="fas fa-database"></i>
        </div>
        <h3 class="state-title">No Search Yet</h3>
        <p class="state-message">
          Enter a phone number or CNIC to search the database.
          Results will appear here automatically.
        </p>
      </div>
    `;
    
    showToast("info", "Cleared", "Search results have been cleared");
  }
  
  function copySingleResult(index) {
    const result = searchResults[index];
    if (!result) return;
    
    const text = `
Mobile: ${result.mobile}
Name: ${result.name}
CNIC: ${result.cnic}
Address: ${result.address}
Source: ${result.source}
    `.trim();
    
    navigator.clipboard.writeText(text)
      .then(() => showToast("success", "Copied!", "Result details copied to clipboard"))
      .catch(() => showToast("error", "Copy Failed", "Could not copy to clipboard"));
  }
  
  function copyAllResults() {
    if (searchResults.length === 0) {
      showToast("warning", "No Data", "No results to copy");
      return;
    }
    
    let text = `DB Service PK Results - ${new Date().toLocaleString()}\n`;
    text += `Total Records: ${searchResults.length}\n\n`;
    
    searchResults.forEach((result, index) => {
      text += `--- Result ${index + 1} ---\n`;
      text += `Mobile: ${result.mobile}\n`;
      text += `Name: ${result.name}\n`;
      text += `CNIC: ${result.cnic}\n`;
      text += `Address: ${result.address}\n`;
      text += `Source: ${result.source}\n\n`;
    });
    
    navigator.clipboard.writeText(text.trim())
      .then(() => showToast("success", "All Results Copied", `${searchResults.length} records copied`))
      .catch(() => showToast("error", "Copy Failed", "Could not copy to clipboard"));
  }
  
  function exportResults() {
    if (searchResults.length === 0) {
      showToast("warning", "No Data", "No results to export");
      return;
    }
    
    const headers = ["Mobile", "Name", "CNIC", "Address", "Source"];
    const csvRows = [
      headers.join(","),
      ...searchResults.map(result => [
        `"${result.mobile}"`,
        `"${result.name}"`,
        `"${result.cnic}"`,
        `"${result.address}"`,
        `"${result.source}"`
      ].join(","))
    ];
    
    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = `db-service-results-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast("success", "Exported", "Results exported as CSV file");
  }
  
  // ===== Truecaller Functions =====
  
  async function performTruecallerSearch() {
    const rawNumber = phoneInput.value.trim();
    
    if (!rawNumber) {
        showToast("error", "Empty Input", "Please enter a phone number first.");
        phoneInput.focus();
        return;
    }

    // نمبر کی تصدیق
    const cleanNumber = rawNumber.replace(/\D/g, '');
    if (!/^(\d{10,11})$/.test(cleanNumber)) {
        showToast("error", "Invalid Number", "Please enter a valid 10 or 11 digit mobile number.");
        phoneInput.focus();
        return;
    }
    
    // Check if Truecaller API is active
    if (truecallerApiBadge.classList.contains("inactive")) {
      showToast("error", "API Offline", "Truecaller API is currently unavailable");
      return;
    }
    
    truecallerBtn.disabled = true;
    truecallerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Searching...';
    
    truecallerModal.style.display = "block";
    showTruecallerLoading();
    
    try {
        // Backend API call
        const response = await fetchWithTimeout(`${TRUECALLER_API}${encodeURIComponent(cleanNumber)}`, 15000, {
            headers: { 
                'x-requested-with': 'XMLHttpRequest',
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP Error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success === false || data.error) {
            throw new Error(data.message || data.error || "API returned false");
        }
        
        phoneInput.value = ""; // Clear input on successful search
        
        const name = data.name && data.name.trim() !== "" ? data.name : "N/A (No Name Found)";
        const sim = data.sim || "Unknown Carrier";

        showTruecallerResult(name, sim);
        
        // Toast message
        if (name.includes("N/A") || name === "N/A (No Name Found)") {
            showToast("warning", "Name Not Found", "Truecaller doesn't have name for this number.");
        } else if (data.source === "backup-api") {
            showToast("info", "Backup API Used", "Data retrieved from backup API.");
        } else {
            showToast("success", "Name Found!", "Caller Name Found!");
        }
        
    } catch (error) {
        console.error("Truecaller Fetch Error:", error);
        showTruecallerError();
        showToast("error", "Search Failed", "Could not fetch from Truecaller. Try later.");
    } finally {
        truecallerBtn.disabled = false;
        truecallerBtn.innerHTML = '<i class="fas fa-id-badge"></i> Truecaller';
    }
  }
  
  // ===== General Utility Functions =====
  
  function showToast(type, title, message) {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    
    const icons = {
      success: "fa-circle-check",
      error: "fa-circle-xmark",
      warning: "fa-triangle-exclamation",
      info: "fa-circle-info"
    };
    
    toast.innerHTML = `
      <div class="toast-icon">
        <i class="fas ${icons[type] || "fa-circle-info"}"></i>
      </div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
      </div>
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
      if (toast.parentNode === toastContainer) {
        toastContainer.removeChild(toast);
      }
    }, 3000);
  }
  
  async function fetchWithTimeout(resource, timeout = 10000, options = {}) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(resource, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      if (error.name === 'AbortError') {
          throw new Error("Request timed out");
      }
      throw error;
    }
  }
});