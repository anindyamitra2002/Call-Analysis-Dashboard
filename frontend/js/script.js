document.addEventListener('DOMContentLoaded', function () {
    // API base URL
    const API_BASE_URL = 'http://localhost:8000/api'; // Adjust if your backend runs elsewhere

    // DOM Elements
    const fromDateEl = document.getElementById('fromDate');
    const toDateEl = document.getElementById('toDate');
    const fetchLogsBtn = document.getElementById('fetchLogsBtn');
    const currentTimeEl = document.getElementById('currentTime');
    const loadingSpinnerEl = document.getElementById('loadingSpinner');
    const initialMessageEl = document.getElementById('initialMessage');
    const noLogsFoundMessageEl = document.getElementById('noLogsFoundMessage');
    const fetchErrorMessageEl = document.getElementById('fetchErrorMessage');
    const dashboardContentEl = document.getElementById('dashboardContent');
    const sidebarErrorEl = document.getElementById('sidebarError');

    // Statistics Elements
    const totalCallsEl = document.getElementById('totalCalls');
    const totalDurationEl = document.getElementById('totalDuration');
    const averageDurationEl = document.getElementById('averageDuration');
    const totalCostEl = document.getElementById('totalCost');

    // Call Logs Table Elements
    const logsTableBodyEl = document.getElementById('logsTableBody');
    const filterPhoneNumberEl = document.getElementById('filterPhoneNumber');
    const filterDateEl = document.getElementById('filterDate');
    const filterSttLanguageEl = document.getElementById('filterSttLanguage');
    const filterLlmModelEl = document.getElementById('filterLlmModel');
    const filterTtsProviderEl = document.getElementById('filterTtsProvider');
    const filterSttProviderEl = document.getElementById('filterSttProvider');
    const filterLlmProviderEl = document.getElementById('filterLlmProvider');
    const filterUseRetrievalEl = document.getElementById('filterUseRetrieval');
    const applyFiltersBtn = document.getElementById('applyFiltersBtn');
    const resetFiltersBtn = document.getElementById('resetFiltersBtn');
    const tableRowCountEl = document.getElementById('tableRowCount');

    // Modal Elements
    const callDetailModalEl = new bootstrap.Modal(document.getElementById('callDetailModal'));
    // Basic Info
    const modalCallDateEl = document.getElementById('modalCallDate');
    const modalCallStartTimeEl = document.getElementById('modalCallStartTime');
    const modalCallEndTimeEl = document.getElementById('modalCallEndTime');
    const modalPhoneNumberEl = document.getElementById('modalPhoneNumber');
    const modalDurationEl = document.getElementById('modalDuration');
    const modalTotalCallCostEl = document.getElementById('modalTotalCallCost'); // For top-level total_cost_usd if available
    // STT
    const modalSttProviderEl = document.getElementById('modalSttProvider');
    const modalSttModelEl = document.getElementById('modalSttModel');
    const modalSttLanguageEl = document.getElementById('modalSttLanguage');
    const modalSttCostPerMinEl = document.getElementById('modalSttCostPerMin');
    // LLM
    const modalLlmProviderEl = document.getElementById('modalLlmProvider');
    const modalLlmModelEl = document.getElementById('modalLlmModel');
    const modalLlmTemperatureEl = document.getElementById('modalLlmTemperature');
    const modalLlmCostPerMinEl = document.getElementById('modalLlmCostPerMin');
    const modalSystemPromptContentEl = document.getElementById('modalSystemPromptContent');
    // TTS
    const modalTtsProviderEl = document.getElementById('modalTtsProvider');
    const modalTtsVoiceEl = document.getElementById('modalTtsVoice');
    const modalTtsLanguageEl = document.getElementById('modalTtsLanguage');
    const modalTtsCostPerMinEl = document.getElementById('modalTtsCostPerMin');
    // Other Config
    const modalFirstMessageContentEl = document.getElementById('modalFirstMessageContent');
    const modalUseRetrievalEl = document.getElementById('modalUseRetrieval');
    const modalAutoEndCallEl = document.getElementById('modalAutoEndCall');
    const modalBackgroundSoundEl = document.getElementById('modalBackgroundSound');
    const modalVadMinSilenceEl = document.getElementById('modalVadMinSilence');
    const modalAllowInterruptionsEl = document.getElementById('modalAllowInterruptions');
    const modalTotalCostPerMinEl = document.getElementById('modalTotalCostPerMin');
    // Transcript & Audio
    const modalConversationTranscriptEl = document.getElementById('modalConversationTranscript');
    const modalAudioPlayerContainerEl = document.getElementById('modalAudioPlayerContainer');
    const modalNoAudioMessageEl = document.getElementById('modalNoAudioMessage');


    let allLogs = []; 
    let filteredLogs = []; 

    const languageNameMap = {
        'en-IN': 'English (India)', 'hi-IN': 'Hindi', 'bn-IN': 'Bengali',
        'ta-IN': 'Tamil', 'te-IN': 'Telugu', 'gu-IN': 'Gujarati',
        'kn-IN': 'Kannada', 'ml-IN': 'Malayalam', 'mr-IN': 'Marathi',
        'or-IN': 'Odia', 'pa-IN': 'Punjabi', 'en-US': 'English (US)',
    };

    function getLanguageName(code) {
        return languageNameMap[code] || code;
    }
    
    function initialize() {
        setDefaultDates();
        updateCurrentTime();
        setInterval(updateCurrentTime, 1000 * 30); 
        fetchLogsBtn.addEventListener('click', fetchAndDisplayLogs);
        applyFiltersBtn.addEventListener('click', applyTableFilters);
        resetFiltersBtn.addEventListener('click', resetAndApplyFilters);

        document.querySelectorAll('#logsTable th[data-sort]').forEach(header => {
            header.addEventListener('click', () => {
                const sortKey = header.getAttribute('data-sort');
                const currentSort = header.getAttribute('data-sort-dir') || 'asc';
                const newSortDir = currentSort === 'asc' ? 'desc' : 'asc';
                
                document.querySelectorAll('#logsTable th[data-sort]').forEach(th => {
                    th.removeAttribute('data-sort-dir');
                    th.classList.remove('sort-asc', 'sort-desc');
                });

                header.setAttribute('data-sort-dir', newSortDir);
                header.classList.add(newSortDir === 'asc' ? 'sort-asc' : 'sort-desc');
                sortTable(sortKey, newSortDir);
            });
        });
    }

    function setDefaultDates() {
        const today = new Date();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 7);

        toDateEl.value = today.toISOString().split('T')[0];
        fromDateEl.value = sevenDaysAgo.toISOString().split('T')[0];
    }

    function updateCurrentTime() {
        const now = new Date();
        const options = { timeZone: 'Asia/Kolkata', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true };
        try {
            currentTimeEl.textContent = now.toLocaleString('en-IN', options) + " IST";
        } catch (e) { 
            currentTimeEl.textContent = now.toLocaleString() + " (Local Time)";
            console.warn("Could not format time to IST, using local time as fallback.");
        }
    }

    async function fetchAndDisplayLogs() {
        const fromDate = fromDateEl.value;
        const toDate = toDateEl.value;
        sidebarErrorEl.textContent = '';

        if (!fromDate || !toDate) {
            sidebarErrorEl.textContent = 'Please select both dates.';
            return;
        }
        if (new Date(fromDate) > new Date(toDate)) {
            sidebarErrorEl.textContent = 'From Date cannot be after To Date.';
            return;
        }

        loadingSpinnerEl.style.display = 'block';
        initialMessageEl.style.display = 'none';
        noLogsFoundMessageEl.style.display = 'none';
        fetchErrorMessageEl.style.display = 'none';
        dashboardContentEl.style.display = 'none'; 

        try {
            const response = await fetch(`${API_BASE_URL}/call-logs?from_date_str=${fromDate}&to_date_str=${toDate}`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: "Unknown server error" }));
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.detail}`);
            }
            // Assuming the backend returns the new detailed structure for each log in the array
            allLogs = await response.json(); 

            if (allLogs && allLogs.length > 0) {
                processAndDisplayLogs(allLogs);
                dashboardContentEl.style.display = 'block';
            } else {
                noLogsFoundMessageEl.style.display = 'block';
                dashboardContentEl.style.display = 'none';
            }
        } catch (error) {
            console.error('Error fetching logs:', error);
            fetchErrorMessageEl.textContent = `Error fetching logs: ${error.message}`;
            fetchErrorMessageEl.style.display = 'block';
            dashboardContentEl.style.display = 'none';
        } finally {
            loadingSpinnerEl.style.display = 'none';
        }
    }
    
    function processAndDisplayLogs(logs) {
        // Process logs for display, using the transformed structure from backend
        logs.forEach(log => {
            // Use the id from backend, or generate one if not available
            if (!log.id) {
                log.id = `call_${new Date(log.call_timestamp_utc).getTime()}_${Math.random().toString(36).substr(2, 9)}`;
            }

            // Convert UTC timestamp to IST for display
            const utcDate = new Date(log.call_timestamp_utc);
            log.call_datetime_ist = new Date(utcDate.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
            log.call_timestamp_ist_display = log.call_datetime_ist.toLocaleDateString('en-CA'); 
            log.call_time_ist_display = log.call_datetime_ist.toLocaleTimeString('en-IN', { 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit', 
                hour12: false 
            });
            
            // Duration is already in seconds from backend
            log.duration_minutes = (log.duration_seconds / 60).toFixed(2);
            
            // For table display and filters - using top-level fields
            log.phone_number_display = log.phone_number;
            log.stt_language_display = getLanguageName(log.stt_language);
            log.llm_model_display = log.llm_model;

            // Costs are already calculated by backend
            // No need to recalculate, just ensure they exist
            log.cost_stt_usd = log.cost_stt_usd || 0;
            log.cost_llm_usd = log.cost_llm_usd || 0;
            log.cost_tts_usd = log.cost_tts_usd || 0;
            log.total_cost_usd = log.total_cost_usd || 0;
        });

        allLogs = logs; 
        filteredLogs = [...allLogs]; 

        populateFilterDropdowns(allLogs);
        displayStatistics(allLogs);
        renderAnalysisCharts(allLogs);
        renderCallLogsTable(filteredLogs); 
    }

    function displayStatistics(logs) {
        const numCalls = logs.length;
        // Use log.duration_seconds which we populated in processAndDisplayLogs
        const totalDurationSeconds = logs.reduce((sum, log) => sum + (log.duration_seconds || 0), 0);
        const totalDurationMinutes = totalDurationSeconds / 60;
        const avgDurationMinutes = numCalls > 0 ? totalDurationMinutes / numCalls : 0;
        // Use log.total_cost_usd which we populated/calculated in processAndDisplayLogs
        const totalCost = logs.reduce((sum, log) => sum + (log.total_cost_usd || 0), 0);

        totalCallsEl.textContent = numCalls.toLocaleString();
        totalDurationEl.textContent = `${totalDurationMinutes.toFixed(1)} min`;
        averageDurationEl.textContent = `${avgDurationMinutes.toFixed(1)} min`;
        totalCostEl.textContent = `$${totalCost.toFixed(2)}`;
    }

    function renderAnalysisCharts(logs) {
        const commonLayoutOptions = {
            font: { family: 'Inter, sans-serif', size: 12, color: '#333' },
            paper_bgcolor: 'rgba(0,0,0,0)', 
            plot_bgcolor: 'rgba(0,0,0,0)',  
            margin: { l: 60, r: 20, t: 40, b: 50, pad: 4 }, // Adjusted margins
            legend: { font: { size: 10 } },
            height: 310, // Explicit height for charts in container
            autosize: true
        };
        const commonPieOptions = {
            textfont: { size: 11 },
            automargin: true,
        }

        if (!logs || logs.length === 0) {
            const noDataMsg = '<p class="text-center text-muted small p-5">No data available for this chart.</p>';
            ['costDistributionChart', 'dailyCostTrendChart', 'sttLanguageChart', 'ttsVoiceChart', 
             'callDurationHistogram', 'callsOverTimeChart', 'llmModelChart', 'llmProviderChart']
            .forEach(id => document.getElementById(id).innerHTML = noDataMsg);
            return;
        }
        renderCostAnalysisCharts(logs, commonLayoutOptions, commonPieOptions);
        renderLanguageDistributionCharts(logs, commonLayoutOptions, commonPieOptions);
        renderTimeAnalysisCharts(logs, commonLayoutOptions);
        renderModelUsageCharts(logs, commonLayoutOptions, commonPieOptions);
    }

    function renderCostAnalysisCharts(logs, layoutOptions, pieOptions) {
        const costBreakdown = { LLM: 0, STT: 0, TTS: 0 };
        logs.forEach(log => { // Assuming cost_llm_usd etc. are now populated at top level of log object
            costBreakdown.LLM += log.cost_llm_usd || 0;
            costBreakdown.STT += log.cost_stt_usd || 0;
            costBreakdown.TTS += log.cost_tts_usd || 0;
        });
        const costDistData = [{
            labels: Object.keys(costBreakdown),
            values: Object.values(costBreakdown),
            type: 'pie', textinfo: 'label+percent', hoverinfo: 'label+value+percent',
            marker: { colors: ['#0d6efd', '#198754', '#ffc107'] }, ...pieOptions
        }];
        Plotly.newPlot('costDistributionChart', costDistData, { ...layoutOptions, title: 'Cost Distribution' }, {responsive: true, displaylogo: false});

        const dailyCosts = {};
        logs.forEach(log => {
            const date = log.call_datetime_ist.toISOString().split('T')[0];
            dailyCosts[date] = (dailyCosts[date] || 0) + (log.total_cost_usd || 0);
        });
        const sortedDates = Object.keys(dailyCosts).sort();
        const dailyCostData = [{
            x: sortedDates, y: sortedDates.map(date => dailyCosts[date]),
            type: 'scatter', mode: 'lines+markers', name: 'Total Cost', line: { color: '#0d6efd' }
        }];
        Plotly.newPlot('dailyCostTrendChart', dailyCostData, { ...layoutOptions, title: 'Daily Cost Trend (USD)', xaxis: { title: 'Date' }, yaxis: { title: 'Total Cost (USD)' } }, {responsive: true, displaylogo: false});
    }

    function renderLanguageDistributionCharts(logs, layoutOptions, pieOptions) {
        const sttLangCounts = {};
        logs.forEach(log => {
            const langName = getLanguageName(log.stt_language);
            sttLangCounts[langName] = (sttLangCounts[langName] || 0) + 1;
        });
        const sttLangData = [{
            labels: Object.keys(sttLangCounts), values: Object.values(sttLangCounts),
            type: 'pie', textinfo: 'label+percent', hoverinfo: 'label+value+percent', ...pieOptions
        }];
        Plotly.newPlot('sttLanguageChart', sttLangData, { ...layoutOptions, title: 'STT Language Distribution' }, {responsive: true, displaylogo: false});

        const ttsVoiceCounts = {};
        logs.forEach(log => {
            ttsVoiceCounts[log.tts_voice] = (ttsVoiceCounts[log.tts_voice] || 0) + 1;
        });
        const ttsVoiceData = [{
            x: Object.keys(ttsVoiceCounts), y: Object.values(ttsVoiceCounts),
            type: 'bar', marker: {color: '#198754'}
        }];
        Plotly.newPlot('ttsVoiceChart', ttsVoiceData, { ...layoutOptions, title: 'TTS Voice Usage', xaxis: { title: 'TTS Voice' }, yaxis: { title: 'Count' } }, {responsive: true, displaylogo: false});
    }

    function renderTimeAnalysisCharts(logs, layoutOptions) {
        const durationsMinutes = logs.map(log => parseFloat(log.duration_minutes));
        const durationHistData = [{
            x: durationsMinutes, type: 'histogram', nbinsx: 20, marker: {color: '#dc3545'}
        }];
        Plotly.newPlot('callDurationHistogram', durationHistData, { ...layoutOptions, title: 'Call Duration Distribution (min)', xaxis: { title: 'Duration (min)' }, yaxis: { title: 'Number of Calls' } }, {responsive: true, displaylogo: false});

        const callsPerDay = {};
        logs.forEach(log => {
            const date = log.call_datetime_ist.toISOString().split('T')[0];
            callsPerDay[date] = (callsPerDay[date] || 0) + 1;
        });
        const sortedDatesCalls = Object.keys(callsPerDay).sort();
        const callsOverTimeData = [{
            x: sortedDatesCalls, y: sortedDatesCalls.map(date => callsPerDay[date]),
            type: 'scatter', mode: 'lines+markers', name: 'Calls', line: {color: '#6f42c1'}
        }];
        Plotly.newPlot('callsOverTimeChart', callsOverTimeData, { ...layoutOptions, title: 'Number of Calls Per Day', xaxis: { title: 'Date' }, yaxis: { title: 'Number of Calls' } }, {responsive: true, displaylogo: false});
    }

    function renderModelUsageCharts(logs, layoutOptions, pieOptions) {
        const llmModelCounts = {};
        logs.forEach(log => {
            llmModelCounts[log.llm_model] = (llmModelCounts[log.llm_model] || 0) + 1;
        });
        const llmModelData = [{
            x: Object.keys(llmModelCounts), y: Object.values(llmModelCounts),
            type: 'bar', marker: {color: '#fd7e14'}
        }];
        Plotly.newPlot('llmModelChart', llmModelData, { ...layoutOptions, title: 'LLM Model Usage', xaxis: { title: 'LLM Model' }, yaxis: { title: 'Count' } }, {responsive: true, displaylogo: false});

        const llmProviderCounts = {};
        logs.forEach(log => {
            llmProviderCounts[log.llm_provider] = (llmProviderCounts[log.llm_provider] || 0) + 1;
        });
        const llmProviderData = [{
            labels: Object.keys(llmProviderCounts), values: Object.values(llmProviderCounts),
            type: 'pie', textinfo: 'label+percent', hoverinfo: 'label+value+percent', ...pieOptions
        }];
        Plotly.newPlot('llmProviderChart', llmProviderData, { ...layoutOptions, title: 'LLM Provider Distribution' }, {responsive: true, displaylogo: false});
    }

    function populateFilterDropdowns(logs) {
        const sttLanguages = [...new Set(logs.map(log => log.stt_language))].sort();
        const llmModels = [...new Set(logs.map(log => log.llm_model))].sort();
        const ttsProviders = [...new Set(logs.map(log => log.tts_provider))].sort();
        const sttProviders = [...new Set(logs.map(log => log.stt_provider))].sort();
        const llmProviders = [...new Set(logs.map(log => log.llm_provider))].sort();

        populateSelect(filterSttLanguageEl, sttLanguages, (lang) => getLanguageName(lang));
        populateSelect(filterLlmModelEl, llmModels);
        populateSelect(filterTtsProviderEl, ttsProviders);
        populateSelect(filterSttProviderEl, sttProviders);
        populateSelect(filterLlmProviderEl, llmProviders);
    }

    function populateSelect(selectElement, options, displayFn = null) {
        while (selectElement.options.length > 1) selectElement.remove(1);
        options.forEach(option => {
            const opt = document.createElement('option');
            opt.value = option;
            opt.textContent = displayFn ? displayFn(option) : option;
            selectElement.appendChild(opt);
        });
    }
    
    function resetAndApplyFilters() {
        filterPhoneNumberEl.value = ''; filterDateEl.value = '';
        filterSttLanguageEl.value = ''; filterLlmModelEl.value = '';
        filterTtsProviderEl.value = ''; filterSttProviderEl.value = '';
        filterLlmProviderEl.value = ''; filterUseRetrievalEl.value = '';
        applyTableFilters();
    }

    function applyTableFilters() {
        const phoneNumberFilter = filterPhoneNumberEl.value.toLowerCase();
        const dateFilter = filterDateEl.value; 
        const sttLangFilter = filterSttLanguageEl.value;
        const llmModelFilter = filterLlmModelEl.value;
        const ttsProviderFilter = filterTtsProviderEl.value;
        const sttProviderFilter = filterSttProviderEl.value;
        const llmProviderFilter = filterLlmProviderEl.value;
        const useRetrievalFilter = filterUseRetrievalEl.value; 

        filteredLogs = allLogs.filter(log => {
            let passes = true;
            if (phoneNumberFilter && !log.phone_number.toLowerCase().includes(phoneNumberFilter)) passes = false;
            if (dateFilter && log.call_datetime_ist.toISOString().split('T')[0] !== dateFilter) passes = false;
            if (sttLangFilter && log.stt_language !== sttLangFilter) passes = false;
            if (llmModelFilter && log.llm_model !== llmModelFilter) passes = false;
            if (ttsProviderFilter && log.tts_provider !== ttsProviderFilter) passes = false;
            if (sttProviderFilter && log.stt_provider !== sttProviderFilter) passes = false;
            if (llmProviderFilter && log.llm_provider !== llmProviderFilter) passes = false;
            if (useRetrievalFilter && String(log.use_retrieval) !== useRetrievalFilter) passes = false;
            return passes;
        });
        renderCallLogsTable(filteredLogs);
    }

    function sortTable(key, direction) {
        // Adjust key for sorting if it's from metadata
        const keyPath = (k) => {
            if (['phone_number', 'stt_language_display', 'llm_model'].includes(k)) {
                if (k === 'phone_number') return ['metadata', 'phone_number'];
                if (k === 'stt_language_display') return ['metadata', 'STT_language']; // Sort by code
                if (k === 'llm_model') return ['metadata', 'LLM_model'];
            }
            return [k]; // Top-level key
        };

        filteredLogs.sort((a, b) => {
            let pathA = keyPath(key);
            let pathB = keyPath(key);

            let valA = pathA.reduce((obj, p) => (obj && obj[p] !== undefined) ? obj[p] : null, a);
            let valB = pathB.reduce((obj, p) => (obj && obj[p] !== undefined) ? obj[p] : null, b);
            
            if (key === 'stt_language_display') { // Special handling for display name sorting
                valA = getLanguageName(valA);
                valB = getLanguageName(valB);
            }


            if (key === 'duration_minutes' || key === 'total_cost_usd') {
                valA = parseFloat(valA);
                valB = parseFloat(valB);
            } else if (typeof valA === 'string') {
                valA = String(valA).toLowerCase(); // Ensure it's a string before toLowerCase
                valB = String(valB).toLowerCase();
            }


            if (valA < valB) return direction === 'asc' ? -1 : 1;
            if (valA > valB) return direction === 'asc' ? 1 : -1;
            return 0;
        });
        renderCallLogsTable(filteredLogs);
    }

    function renderCallLogsTable(logsToRender) {
        logsTableBodyEl.innerHTML = ''; 
        if (logsToRender.length === 0) {
            logsTableBodyEl.innerHTML = '<tr><td colspan="8" class="text-center p-4">No logs match the current filters.</td></tr>';
            tableRowCountEl.textContent = 'Showing 0 logs.';
            return;
        }

        logsToRender.forEach((log) => {
            const row = logsTableBodyEl.insertRow();
            row.insertCell().textContent = log.call_timestamp_ist_display;
            row.insertCell().textContent = log.call_time_ist_display;
            row.insertCell().textContent = `${log.duration_minutes} min`;
            row.insertCell().textContent = log.phone_number_display; // Use processed display field
            row.insertCell().textContent = log.stt_language_display; // Use processed display field
            row.insertCell().textContent = log.llm_model_display;    // Use processed display field
            row.insertCell().textContent = `$${(log.total_cost_usd || 0).toFixed(4)}`;
            
            const actionsCell = row.insertCell();
            const viewButton = document.createElement('button');
            viewButton.classList.add('btn', 'btn-sm', 'btn-outline-primary');
            viewButton.innerHTML = '<i class="fas fa-eye me-1"></i> View'; 
            viewButton.onclick = () => displayLogDetailsInModal(log);
            actionsCell.appendChild(viewButton);
        });
        tableRowCountEl.textContent = `Showing ${logsToRender.length} of ${allLogs.length} logs.`;
    }

    function displayLogDetailsInModal(log) {
        if (!log) {
            console.error("No log data provided for modal");
            modalCallDateEl.textContent = 'Error: No data available';
            return;
        }

        const N_A = "N/A";

        // Basic Info
        const startDate = new Date(log.call_timestamp_utc);
        modalCallDateEl.textContent = startDate.toLocaleDateString('en-CA');
        modalCallStartTimeEl.textContent = startDate.toLocaleTimeString('en-IN', { 
            timeZone: 'Asia/Kolkata', 
            hour12: true 
        });
        // Calculate end time from start time and duration
        const endDate = new Date(startDate.getTime() + (log.duration_seconds * 1000));
        modalCallEndTimeEl.textContent = endDate.toLocaleTimeString('en-IN', { 
            timeZone: 'Asia/Kolkata', 
            hour12: true 
        });
        
        modalPhoneNumberEl.textContent = log.phone_number || N_A;
        modalDurationEl.textContent = `${(log.duration_seconds / 60).toFixed(2)} min (${log.duration_seconds.toFixed(2)}s)`;
        modalTotalCallCostEl.textContent = `$${log.total_cost_usd.toFixed(4)}`;

        // STT
        modalSttProviderEl.textContent = log.stt_provider || N_A;
        modalSttModelEl.textContent = N_A; // Not available in transformed data
        modalSttLanguageEl.textContent = getLanguageName(log.stt_language) || N_A;
        modalSttCostPerMinEl.textContent = log.cost_stt_usd ? (log.cost_stt_usd / (log.duration_seconds / 60)).toFixed(5) : N_A;

        // LLM
        modalLlmProviderEl.textContent = log.llm_provider || N_A;
        modalLlmModelEl.textContent = log.llm_model || N_A;
        modalLlmTemperatureEl.textContent = N_A; // Not available in transformed data
        modalLlmCostPerMinEl.textContent = log.cost_llm_usd ? (log.cost_llm_usd / (log.duration_seconds / 60)).toFixed(5) : N_A;
        modalSystemPromptContentEl.textContent = log.system_prompt || N_A;
        
        // TTS
        modalTtsProviderEl.textContent = log.tts_provider || N_A;
        modalTtsVoiceEl.textContent = log.tts_voice || N_A;
        modalTtsLanguageEl.textContent = N_A; // Not available in transformed data
        modalTtsCostPerMinEl.textContent = log.cost_tts_usd ? (log.cost_tts_usd / (log.duration_seconds / 60)).toFixed(5) : N_A;

        // Other Config
        modalFirstMessageContentEl.textContent = log.first_message || N_A;
        modalUseRetrievalEl.textContent = typeof log.use_retrieval === 'boolean' ? (log.use_retrieval ? 'Yes' : 'No') : N_A;
        modalAutoEndCallEl.textContent = N_A; // Not available in transformed data
        modalBackgroundSoundEl.textContent = N_A; // Not available in transformed data
        modalVadMinSilenceEl.textContent = N_A; // Not available in transformed data
        modalAllowInterruptionsEl.textContent = N_A; // Not available in transformed data
        modalTotalCostPerMinEl.textContent = log.total_cost_usd ? (log.total_cost_usd / (log.duration_seconds / 60)).toFixed(5) : N_A;

        // Conversation Transcript
        modalConversationTranscriptEl.innerHTML = '';
        if (log.transcript && log.transcript.length > 0) {
            log.transcript.forEach(item => {
                const messageDiv = document.createElement('div');
                messageDiv.classList.add('transcript-entry', item.role.toLowerCase() === 'user' ? 'transcript-user' : 'transcript-assistant');
                
                const roleSpan = document.createElement('span');
                roleSpan.classList.add('transcript-role');
                roleSpan.textContent = `${item.role}:`;
                
                const messageP = document.createElement('p');
                messageP.textContent = item.content || item.message || ''; // Handle both content and message fields

                messageDiv.appendChild(roleSpan);
                messageDiv.appendChild(messageP);
                modalConversationTranscriptEl.appendChild(messageDiv);
            });
        } else {
            modalConversationTranscriptEl.innerHTML = '<p class="text-muted p-2">No transcript available.</p>';
        }

        // Audio Player
        modalAudioPlayerContainerEl.innerHTML = ''; 
        if (log.audio_url) {
            const audioEl = document.createElement('audio');
            audioEl.controls = true;
            audioEl.src = log.audio_url;
            audioEl.classList.add('w-100');
            modalAudioPlayerContainerEl.appendChild(audioEl);
            modalNoAudioMessageEl.style.display = 'none';
        } else {
            modalNoAudioMessageEl.style.display = 'block';
        }
        
        // Collapse all accordions in the modal initially
        const accordions = document.querySelectorAll('#modalMetadataAccordion .accordion-collapse');
        accordions.forEach(acc => {
            const bsCollapse = bootstrap.Collapse.getInstance(acc);
            if (bsCollapse) {
                bsCollapse.hide();
            }
        });

        callDetailModalEl.show();
    }

    initialize();
});
