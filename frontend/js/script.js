document.addEventListener('DOMContentLoaded', function () {
    // API base URL
    const API_BASE_URL = 'http://localhost:8000/api';

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
    const modalCallDateEl = document.getElementById('modalCallDate');
    const modalCallStartTimeEl = document.getElementById('modalCallStartTime');
    const modalCallEndTimeEl = document.getElementById('modalCallEndTime');
    const modalPhoneNumberEl = document.getElementById('modalPhoneNumber');
    const modalDurationEl = document.getElementById('modalDuration');
    const modalTotalCallCostEl = document.getElementById('modalTotalCallCost');
    const modalSttProviderEl = document.getElementById('modalSttProvider');
    const modalSttModelEl = document.getElementById('modalSttModel');
    const modalSttLanguageEl = document.getElementById('modalSttLanguage');
    const modalSttCostPerMinEl = document.getElementById('modalSttCostPerMin');
    const modalLlmProviderEl = document.getElementById('modalLlmProvider');
    const modalLlmModelEl = document.getElementById('modalLlmModel');
    const modalLlmTemperatureEl = document.getElementById('modalLlmTemperature');
    const modalLlmCostPerMinEl = document.getElementById('modalLlmCostPerMin');
    const modalSystemPromptContentEl = document.getElementById('modalSystemPromptContent');
    const modalTtsProviderEl = document.getElementById('modalTtsProvider');
    const modalTtsVoiceEl = document.getElementById('modalTtsVoice');
    const modalTtsLanguageEl = document.getElementById('modalTtsLanguage');
    const modalTtsCostPerMinEl = document.getElementById('modalTtsCostPerMin');
    const modalFirstMessageContentEl = document.getElementById('modalFirstMessageContent');
    const modalUseRetrievalEl = document.getElementById('modalUseRetrieval');
    const modalAutoEndCallEl = document.getElementById('modalAutoEndCall');
    const modalBackgroundSoundEl = document.getElementById('modalBackgroundSound');
    const modalVadMinSilenceEl = document.getElementById('modalVadMinSilence');
    const modalAllowInterruptionsEl = document.getElementById('modalAllowInterruptions');
    const modalTotalCostPerMinEl = document.getElementById('modalTotalCostPerMin');
    const modalConversationTranscriptEl = document.getElementById('modalConversationTranscript');
    const modalAudioPlayerContainerEl = document.getElementById('modalAudioPlayerContainer');
    const modalNoAudioMessageEl = document.getElementById('modalNoAudioMessage');

    let allLogs = [];
    let filteredLogs = [];
    let chartInstances = {};

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
        updateLoadingSpinner();
        setInterval(updateCurrentTime, 1000 * 30);
        fetchLogsBtn.addEventListener('click', fetchAndDisplayLogs);
        applyFiltersBtn.addEventListener('click', applyTableFilters);
        resetFiltersBtn.addEventListener('click', resetAndApplyFilters);

        // Initialize sort icons for table headers
        document.querySelectorAll('#logsTable th[data-sort]').forEach(header => {
            const icon = document.createElement('i');
            icon.classList.add('fas', 'fa-sort'); // Default sort icon
            header.appendChild(icon);
            header.addEventListener('click', () => {
                const sortKey = header.getAttribute('data-sort');
                const currentSortDir = header.getAttribute('data-sort-dir');
                let newSortDir;

                if (currentSortDir === 'asc') {
                    newSortDir = 'desc';
                } else if (currentSortDir === 'desc') {
                    newSortDir = 'asc'; // Or reset: newSortDir = null; header.removeAttribute('data-sort-dir');
                } else {
                    newSortDir = 'asc';
                }
                
                document.querySelectorAll('#logsTable th[data-sort]').forEach(th => {
                    th.removeAttribute('data-sort-dir');
                    th.classList.remove('sort-asc', 'sort-desc');
                    th.querySelector('.fas').className = 'fas fa-sort'; // Reset icon
                });

                header.setAttribute('data-sort-dir', newSortDir);
                header.classList.add(newSortDir === 'asc' ? 'sort-asc' : 'sort-desc');
                header.querySelector('.fas').className = `fas fa-sort-${newSortDir === 'asc' ? 'up' : 'down'}`;
                
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

        if (!fromDate || !toDate) {
            showError('Please select both dates.');
            return;
        }
        if (new Date(fromDate) > new Date(toDate)) {
            showError('From Date cannot be after To Date.');
            return;
        }

        // Show loading state
        showLoading();

        try {
            const response = await fetch(`${API_BASE_URL}/call-logs?from_date_str=${fromDate}&to_date_str=${toDate}`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: "Unknown server error" }));
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.detail}`);
            }
            allLogs = await response.json();

            if (allLogs && allLogs.length > 0) {
                // Process and display logs
                processAndDisplayLogs(allLogs);
                // Hide initial message and show dashboard
                hideInitialState();
                showDashboard();
            } else {
                showNoLogs();
            }
        } catch (error) {
            console.error('Error fetching logs:', error);
            showError(`Error fetching logs: ${error.message}. Ensure the backend is running.`);
        } finally {
            hideLoading();
        }
    }

    function showLoading() {
        // Hide all other states
        initialMessageEl.style.display = 'none';
        noLogsFoundMessageEl.style.display = 'none';
        fetchErrorMessageEl.style.display = 'none';
        dashboardContentEl.style.display = 'none';
        
        // Show loading spinner
        loadingSpinnerEl.style.display = 'flex';
        loadingSpinnerEl.style.flexDirection = 'column';
        loadingSpinnerEl.style.alignItems = 'center';
        loadingSpinnerEl.style.justifyContent = 'center';
    }

    function hideLoading() {
        loadingSpinnerEl.style.display = 'none';
    }

    function showError(message) {
        fetchErrorMessageEl.textContent = message;
        fetchErrorMessageEl.style.display = 'block';
        dashboardContentEl.style.display = 'none';
        initialMessageEl.style.display = 'none';
    }

    function hideError() {
        fetchErrorMessageEl.style.display = 'none';
    }

    function showNoLogs() {
        noLogsFoundMessageEl.style.display = 'block';
        dashboardContentEl.style.display = 'none';
        initialMessageEl.style.display = 'none';
        clearAllCharts();
    }

    function hideInitialState() {
        initialMessageEl.style.display = 'none';
    }

    function showDashboard() {
        dashboardContentEl.style.display = 'block';
        initialMessageEl.style.display = 'none';
        noLogsFoundMessageEl.style.display = 'none';
        fetchErrorMessageEl.style.display = 'none';
    }

    // Update the loading spinner HTML structure
    function updateLoadingSpinner() {
        loadingSpinnerEl.innerHTML = `
            <div class="spinner-container">
                <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-3 text-primary">Fetching analytics data...</p>
            </div>
        `;
    }

    function processAndDisplayLogs(logs) {
        console.log("%c=== Processing Logs ===", "background: #4CAF50; color: white; padding: 2px 5px;");
        console.log("Number of logs to process:", logs.length);
        
        logs.forEach((log, index) => {
            console.log(`%cProcessing log ${index + 1}:`, "font-weight: bold; color: #4CAF50;");
            console.log("Raw log data:", log);
            
            // Log the specific fields before processing
            console.log("Before processing - Raw values:", {
                stt_model: log.stt_model,
                tts_language: log.tts_language,
                vad_min_silence: log.vad_min_silence
            });

            if (!log.id) {
                log.id = `call_${new Date(log.call_timestamp_utc).getTime()}_${Math.random().toString(36).substr(2, 9)}`;
            }
            const utcDate = new Date(log.call_timestamp_utc);
            log.call_datetime_ist = new Date(utcDate.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
            log.call_timestamp_ist_display = log.call_datetime_ist.toLocaleDateString('en-CA');
            log.call_time_ist_display = log.call_datetime_ist.toLocaleTimeString('en-IN', {
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
            });
            log.duration_minutes = (log.duration_seconds / 60).toFixed(2);
            log.phone_number_display = log.phone_number;
            log.stt_language_display = getLanguageName(log.stt_language);
            log.llm_model_display = log.llm_model;
            log.cost_stt_usd = log.cost_stt_usd || 0;
            log.cost_llm_usd = log.cost_llm_usd || 0;
            log.cost_tts_usd = log.cost_tts_usd || 0;
            log.total_cost_usd = log.total_cost_usd || 0;

            // Add missing fields with default values if not present
            log.stt_model = log.stt_model || '';
            log.llm_temperature = log.llm_temperature || 0.7;
            log.tts_language = log.tts_language || '';
            log.auto_end_call = log.auto_end_call || false;
            log.background_sound = log.background_sound || false;
            log.vad_min_silence = log.vad_min_silence || 0;
            log.allow_interruptions = log.allow_interruptions || false;

            // Log the specific fields after processing
            console.log("After processing - Processed values:", {
                stt_model: log.stt_model,
                tts_language: log.tts_language,
                vad_min_silence: log.vad_min_silence
            });
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
        const totalDurationSeconds = logs.reduce((sum, log) => sum + (log.duration_seconds || 0), 0);
        const totalDurationMinutes = totalDurationSeconds / 60;
        const avgDurationMinutes = numCalls > 0 ? totalDurationMinutes / numCalls : 0;
        const totalCost = logs.reduce((sum, log) => sum + (log.total_cost_usd || 0), 0);

        totalCallsEl.textContent = numCalls.toLocaleString();
        totalDurationEl.textContent = `${totalDurationMinutes.toFixed(1)} min`;
        averageDurationEl.textContent = `${avgDurationMinutes.toFixed(1)} min`;
        totalCostEl.textContent = `$${totalCost.toFixed(2)}`;
    }

    // --- Chart.js Implementation ---
    function destroyChart(chartId) {
        if (chartInstances[chartId]) {
            chartInstances[chartId].destroy();
            delete chartInstances[chartId];
        }
    }

    function clearAllCharts() {
        Object.keys(chartInstances).forEach(destroyChart);
        const chartContainers = document.querySelectorAll('.chart-container-wrapper');
        chartContainers.forEach(container => {
            const canvas = container.querySelector('canvas');
            if (canvas) {
                 // Display a message if no data
                const noDataEl = document.createElement('div');
                noDataEl.classList.add('no-chart-data');
                noDataEl.textContent = 'No data to display for this chart.';
                // Clear previous message if any
                const existingMsg = container.querySelector('.no-chart-data');
                if(existingMsg) existingMsg.remove();
                container.appendChild(noDataEl);
            }
        });
    }
    
    function renderChart(chartId, type, data, options) {
        destroyChart(chartId); // Destroy existing chart before rendering a new one
        const ctx = document.getElementById(chartId);
        if (!ctx) {
            console.error(`Canvas element with id ${chartId} not found.`);
            return;
        }
        // Remove any "no data" message
        const parentWrapper = ctx.closest('.chart-container-wrapper');
        const noDataMsg = parentWrapper ? parentWrapper.querySelector('.no-chart-data') : null;
        if (noDataMsg) noDataMsg.remove();

        chartInstances[chartId] = new Chart(ctx, { type, data, options });
    }


    function renderAnalysisCharts(logs) {
        const commonOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { font: { size: 10 } }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null && context.parsed.y !== undefined) {
                                label += context.parsed.y.toFixed(2);
                            } else if (context.parsed !== null && context.parsed !== undefined && typeof context.parsed === 'number') { // For pie/doughnut
                                label += context.parsed.toFixed(2);
                            }
                            return label;
                        }
                    }
                }
            },
            scales: { // Default scales, can be overridden
                x: {
                    grid: { display: false },
                    ticks: { font: { size: 10 } }
                },
                y: {
                    grid: { color: '#e0e0e0', borderDash: [2, 2] },
                    ticks: { font: { size: 10 }, beginAtZero: true }
                }
            }
        };
        
        const commonPieOptions = { // Specific options for pie/doughnut charts
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { font: { size: 10 }, boxWidth: 10 }
                },
                 tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed !== null && context.parsed !== undefined) {
                                label += context.parsed.toFixed(2);
                                if (context.dataset.dataTotal) { // Calculate percentage
                                     const percentage = (context.parsed / context.dataset.dataTotal * 100).toFixed(1);
                                     label += ` (${percentage}%)`;
                                }
                            }
                            return label;
                        }
                    }
                }
            }
        };

        if (!logs || logs.length === 0) {
            clearAllCharts();
            return;
        }

        renderCostAnalysisCharts(logs, commonOptions, commonPieOptions);
        renderLanguageDistributionCharts(logs, commonOptions, commonPieOptions);
        renderTimeAnalysisCharts(logs, commonOptions);
        renderModelUsageCharts(logs, commonOptions, commonPieOptions);
    }

    function renderCostAnalysisCharts(logs, commonOptions, commonPieOptions) {
        const costBreakdown = { LLM: 0, STT: 0, TTS: 0 };
        logs.forEach(log => {
            costBreakdown.LLM += log.cost_llm_usd || 0;
            costBreakdown.STT += log.cost_stt_usd || 0;
            costBreakdown.TTS += log.cost_tts_usd || 0;
        });
        const totalCostForAllComponents = Object.values(costBreakdown).reduce((a, b) => a + b, 0);

        const costDistData = {
            labels: Object.keys(costBreakdown),
            datasets: [{
                label: 'Cost Distribution',
                data: Object.values(costBreakdown),
                backgroundColor: ['#007bff', '#28a745', '#ffc107'], // Blue, Green, Yellow
                borderColor: '#fff',
                borderWidth: 1,
                dataTotal: totalCostForAllComponents // For percentage calculation
            }]
        };
        renderChart('costDistributionChart', 'pie', costDistData, { ...commonPieOptions, plugins: { ...commonPieOptions.plugins, title: { display: true, text: 'Cost Distribution by Component', font:{size:12}} } });

        const dailyCosts = {};
        logs.forEach(log => {
            const date = log.call_datetime_ist.toISOString().split('T')[0];
            dailyCosts[date] = (dailyCosts[date] || 0) + (log.total_cost_usd || 0);
        });
        const sortedDates = Object.keys(dailyCosts).sort((a,b) => new Date(a) - new Date(b));
        const dailyCostData = {
            labels: sortedDates,
            datasets: [{
                label: 'Total Daily Cost (USD)',
                data: sortedDates.map(date => dailyCosts[date]),
                borderColor: '#007bff',
                backgroundColor: 'rgba(0, 123, 255, 0.1)',
                tension: 0.1,
                fill: true,
                pointRadius: 3,
                pointHoverRadius: 5
            }]
        };
        renderChart('dailyCostTrendChart', 'line', dailyCostData, { ...commonOptions, plugins: { ...commonOptions.plugins, title: { display: true, text: 'Daily Cost Trend (USD)', font:{size:12}} }, scales: { x: { type: 'time', time: { unit: 'day' }, title: { display: true, text: 'Date'}}, y: { title: {display: true, text: 'Cost (USD)'}}}});
    }

    function renderLanguageDistributionCharts(logs, commonOptions, commonPieOptions) {
        const sttLangCounts = {};
        logs.forEach(log => {
            const langName = getLanguageName(log.stt_language);
            sttLangCounts[langName] = (sttLangCounts[langName] || 0) + 1;
        });
        const totalSttLangs = Object.values(sttLangCounts).reduce((a, b) => a + b, 0);
        const sttLangData = {
            labels: Object.keys(sttLangCounts),
            datasets: [{
                label: 'STT Languages',
                data: Object.values(sttLangCounts),
                backgroundColor: ['#17a2b8', '#fd7e14', '#6f42c1', '#e83e8c', '#20c997'], // Info, Orange, Purple, Pink, Teal
                borderColor: '#fff',
                borderWidth: 1,
                dataTotal: totalSttLangs
            }]
        };
        renderChart('sttLanguageChart', 'doughnut', sttLangData, { ...commonPieOptions, plugins: { ...commonPieOptions.plugins, title: { display: true, text: 'STT Language Distribution', font:{size:12}} } });

        const ttsVoiceCounts = {};
        logs.forEach(log => {
            const voice = log.tts_voice || 'N/A';
            ttsVoiceCounts[voice] = (ttsVoiceCounts[voice] || 0) + 1;
        });
        const ttsVoiceData = {
            labels: Object.keys(ttsVoiceCounts),
            datasets: [{
                label: 'TTS Voice Usage',
                data: Object.values(ttsVoiceCounts),
                backgroundColor: '#28a745', // Green
                borderColor: '#208A38',
                borderWidth: 1,
                borderRadius: 4
            }]
        };
        renderChart('ttsVoiceChart', 'bar', ttsVoiceData, { ...commonOptions, plugins: { ...commonOptions.plugins, title: { display: true, text: 'TTS Voice Usage', font:{size:12}} }, scales: {x: {title:{display:true, text:'TTS Voice'}}, y: {title:{display:true, text:'Count'}}}});
    }

    function renderTimeAnalysisCharts(logs, commonOptions) {
        const durationsMinutes = logs.map(log => parseFloat(log.duration_minutes));
        // For histogram, we can use a bar chart with binned data if Chart.js doesn't have a direct histogram type
        // Simple approach: just plot durations if number of calls is not too large, or bin them manually.
        // For simplicity, let's create bins for a bar chart.
        const maxDuration = Math.max(...durationsMinutes, 0);
        const binSize = Math.max(1, Math.ceil(maxDuration / 10)); // Aim for around 10 bins
        const bins = {};
        durationsMinutes.forEach(d => {
            const binStart = Math.floor(d / binSize) * binSize;
            const binLabel = `${binStart}-${binStart + binSize-1} min`;
            bins[binLabel] = (bins[binLabel] || 0) + 1;
        });

        const durationHistData = {
            labels: Object.keys(bins).sort((a,b) => parseFloat(a.split('-')[0]) - parseFloat(b.split('-')[0])), // Sort bins
            datasets: [{
                label: 'Number of Calls',
                data: Object.keys(bins).sort((a,b) => parseFloat(a.split('-')[0]) - parseFloat(b.split('-')[0])).map(key => bins[key]),
                backgroundColor: '#dc3545', // Red
                borderColor: '#B02A37',
                borderWidth: 1,
                borderRadius: 4
            }]
        };
        renderChart('callDurationHistogram', 'bar', durationHistData, { ...commonOptions, plugins: { ...commonOptions.plugins, title: { display: true, text: 'Call Duration Distribution', font:{size:12}} }, scales: {x: {title:{display:true, text:'Duration (min)'}}, y: {title:{display:true, text:'Number of Calls'}}}});

        const callsPerDay = {};
        logs.forEach(log => {
            const date = log.call_datetime_ist.toISOString().split('T')[0];
            callsPerDay[date] = (callsPerDay[date] || 0) + 1;
        });
        const sortedDatesCalls = Object.keys(callsPerDay).sort((a,b) => new Date(a) - new Date(b));
        const callsOverTimeData = {
            labels: sortedDatesCalls,
            datasets: [{
                label: 'Number of Calls',
                data: sortedDatesCalls.map(date => callsPerDay[date]),
                borderColor: '#6f42c1', // Purple
                backgroundColor: 'rgba(111, 66, 193, 0.1)',
                tension: 0.1,
                fill: true,
                pointRadius: 3,
                pointHoverRadius: 5
            }]
        };
        renderChart('callsOverTimeChart', 'line', callsOverTimeData, { ...commonOptions, plugins: { ...commonOptions.plugins, title: { display: true, text: 'Number of Calls Per Day', font:{size:12}} }, scales: { x: { type: 'time', time: { unit: 'day' }, title: { display: true, text: 'Date'}}, y: {title:{display:true, text:'Number of Calls'}}}});
    }

    function renderModelUsageCharts(logs, commonOptions, commonPieOptions) {
        const llmModelCounts = {};
        logs.forEach(log => {
            const model = log.llm_model || 'N/A';
            llmModelCounts[model] = (llmModelCounts[model] || 0) + 1;
        });
        const llmModelData = {
            labels: Object.keys(llmModelCounts),
            datasets: [{
                label: 'LLM Model Usage',
                data: Object.values(llmModelCounts),
                backgroundColor: '#fd7e14', // Orange
                borderColor: '#CB6511',
                borderWidth: 1,
                borderRadius: 4
            }]
        };
        renderChart('llmModelChart', 'bar', llmModelData, { ...commonOptions, plugins: { ...commonOptions.plugins, title: { display: true, text: 'LLM Model Usage', font:{size:12}} }, scales: {x: {title:{display:true, text:'LLM Model'}}, y: {title:{display:true, text:'Count'}}}});

        const llmProviderCounts = {};
        logs.forEach(log => {
            const provider = log.llm_provider || 'N/A';
            llmProviderCounts[provider] = (llmProviderCounts[provider] || 0) + 1;
        });
        const totalLlmProviders = Object.values(llmProviderCounts).reduce((a, b) => a + b, 0);
        const llmProviderData = {
            labels: Object.keys(llmProviderCounts),
            datasets: [{
                label: 'LLM Providers',
                data: Object.values(llmProviderCounts),
                backgroundColor: ['#ffc107', '#17a2b8', '#6610f2', '#e83e8c'], // Yellow, Info, Indigo, Pink
                borderColor: '#fff',
                borderWidth: 1,
                dataTotal: totalLlmProviders
            }]
        };
        renderChart('llmProviderChart', 'pie', llmProviderData, { ...commonPieOptions, plugins: { ...commonPieOptions.plugins, title: { display: true, text: 'LLM Provider Distribution', font:{size:12}} } });
    }

    // --- End Chart.js Implementation ---

    function populateFilterDropdowns(logs) {
        const sttLanguages = [...new Set(logs.map(log => log.stt_language))].sort();
        const llmModels = [...new Set(logs.map(log => log.llm_model).filter(m => m))].sort(); // Filter out null/empty models
        const ttsProviders = [...new Set(logs.map(log => log.tts_provider).filter(p => p))].sort();
        const sttProviders = [...new Set(logs.map(log => log.stt_provider).filter(p => p))].sort();
        const llmProviders = [...new Set(logs.map(log => log.llm_provider).filter(p => p))].sort();

        populateSelect(filterSttLanguageEl, sttLanguages, (lang) => getLanguageName(lang));
        populateSelect(filterLlmModelEl, llmModels);
        populateSelect(filterTtsProviderEl, ttsProviders);
        populateSelect(filterSttProviderEl, sttProviders);
        populateSelect(filterLlmProviderEl, llmProviders);
    }

    function populateSelect(selectElement, options, displayFn = null) {
        const currentValue = selectElement.value; // Preserve selected value if possible
        while (selectElement.options.length > 1) selectElement.remove(1); // Keep "All"
        options.forEach(option => {
            const opt = document.createElement('option');
            opt.value = option;
            opt.textContent = displayFn ? displayFn(option) : option;
            selectElement.appendChild(opt);
        });
        if (options.includes(currentValue)) { // Restore selection
             selectElement.value = currentValue;
        } else if (selectElement.options.length > 0) { // Default to "All" if previous selection not available
            selectElement.value = "";
        }
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
            if (phoneNumberFilter && !(log.phone_number || '').toLowerCase().includes(phoneNumberFilter)) passes = false;
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
        // Optionally, re-render charts based on filtered logs
        // renderAnalysisCharts(filteredLogs); // Uncomment if charts should reflect table filters
    }

    function sortTable(key, direction) {
        filteredLogs.sort((a, b) => {
            let valA = a[key];
            let valB = b[key];

            // Handle numeric, date, or string sorting appropriately
            if (key === 'duration_minutes' || key === 'total_cost_usd') {
                valA = parseFloat(valA);
                valB = parseFloat(valB);
            } else if (key === 'call_timestamp_ist_display') { // Date sorting
                 valA = new Date(a.call_datetime_ist);
                 valB = new Date(b.call_datetime_ist);
            } else if (typeof valA === 'string' && typeof valB === 'string') {
                valA = valA.toLowerCase();
                valB = valB.toLowerCase();
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
            row.insertCell().textContent = log.phone_number_display;
            row.insertCell().textContent = log.stt_language_display;
            row.insertCell().textContent = log.llm_model_display;
            row.insertCell().textContent = `$${(log.total_cost_usd || 0).toFixed(4)}`;

            const actionsCell = row.insertCell();
            actionsCell.classList.add('text-center');
            const viewButton = document.createElement('button');
            viewButton.classList.add('btn', 'btn-sm', 'btn-outline-primary');
            viewButton.innerHTML = '<i class="fas fa-eye"></i>'; // Icon only for smaller button
            viewButton.title = "View Details"; // Tooltip
            viewButton.onclick = () => displayLogDetailsInModal(log);
            actionsCell.appendChild(viewButton);
        });
        tableRowCountEl.textContent = `Showing ${logsToRender.length} of ${allLogs.length} logs.`;
    }

    function displayLogDetailsInModal(log) {
        if (!log) {
            console.error("No log data provided for modal");
            return;
        }

        try {
            console.log("%c=== Modal Display Debug ===", "background: #4CAF50; color: white; padding: 2px 5px;");
            console.log("Log object being displayed:", log);
            
            // Debug specific fields
            console.log("Field values in modal:", {
                stt_model: {
                    value: log.stt_model,
                    type: typeof log.stt_model,
                    isNull: log.stt_model === null,
                    isUndefined: log.stt_model === undefined,
                    isEmpty: log.stt_model === ''
                },
                tts_language: {
                    value: log.tts_language,
                    type: typeof log.tts_language,
                    isNull: log.tts_language === null,
                    isUndefined: log.tts_language === undefined,
                    isEmpty: log.tts_language === ''
                },
                vad_min_silence: {
                    value: log.vad_min_silence,
                    type: typeof log.vad_min_silence,
                    isNull: log.vad_min_silence === null,
                    isUndefined: log.vad_min_silence === undefined,
                    isZero: log.vad_min_silence === 0
                }
            });

            const N_A = "N/A";

            // Format date and time
            const startDate = new Date(log.call_timestamp_utc);
            modalCallDateEl.textContent = startDate.toLocaleDateString('en-CA') || N_A;
            modalCallStartTimeEl.textContent = startDate.toLocaleTimeString('en-IN', {
                timeZone: 'Asia/Kolkata', hour12: true, hour: '2-digit', minute: '2-digit'
            }) || N_A;
            
            const endDate = new Date(startDate.getTime() + (log.duration_seconds * 1000));
            modalCallEndTimeEl.textContent = endDate.toLocaleTimeString('en-IN', {
                timeZone: 'Asia/Kolkata', hour12: true, hour: '2-digit', minute: '2-digit'
            }) || N_A;

            // Basic call info
            modalPhoneNumberEl.textContent = log.phone_number || N_A;
            modalDurationEl.textContent = `${(log.duration_seconds / 60).toFixed(2)} min (${log.duration_seconds.toFixed(2)}s)` || N_A;
            modalTotalCallCostEl.textContent = log.total_cost_usd !== undefined ? `$${log.total_cost_usd.toFixed(4)}` : N_A;

            // STT Details
            modalSttProviderEl.textContent = log.stt_provider || N_A;
            modalSttModelEl.textContent = log.stt_model || N_A;
            modalSttLanguageEl.textContent = getLanguageName(log.stt_language) || N_A;
            const sttCostPerMin = (log.duration_seconds > 0 && log.cost_stt_usd !== undefined) ? (log.cost_stt_usd / (log.duration_seconds / 60)).toFixed(5) : N_A;
            modalSttCostPerMinEl.textContent = sttCostPerMin;

            // LLM Details
            modalLlmProviderEl.textContent = log.llm_provider || N_A;
            modalLlmModelEl.textContent = log.llm_model || N_A;
            modalLlmTemperatureEl.textContent = log.llm_temperature !== undefined ? log.llm_temperature.toFixed(2) : N_A;
            const llmCostPerMin = (log.duration_seconds > 0 && log.cost_llm_usd !== undefined) ? (log.cost_llm_usd / (log.duration_seconds / 60)).toFixed(5) : N_A;
            modalLlmCostPerMinEl.textContent = llmCostPerMin;
            modalSystemPromptContentEl.textContent = log.system_prompt || N_A;

            // TTS Details
            modalTtsProviderEl.textContent = log.tts_provider || N_A;
            modalTtsVoiceEl.textContent = log.tts_voice || N_A;
            modalTtsLanguageEl.textContent = getLanguageName(log.tts_language || log.stt_language) || N_A; // Fallback to stt_language if tts_language is empty
            const ttsCostPerMin = (log.duration_seconds > 0 && log.cost_tts_usd !== undefined) ? (log.cost_tts_usd / (log.duration_seconds / 60)).toFixed(5) : N_A;
            modalTtsCostPerMinEl.textContent = ttsCostPerMin;

            // Other Configurations
            modalFirstMessageContentEl.textContent = log.first_message || N_A;
            modalUseRetrievalEl.textContent = typeof log.use_retrieval === 'boolean' ? (log.use_retrieval ? 'Yes' : 'No') : N_A;
            modalAutoEndCallEl.textContent = typeof log.auto_end_call === 'boolean' ? (log.auto_end_call ? 'Yes' : 'No') : N_A;
            modalBackgroundSoundEl.textContent = typeof log.background_sound === 'boolean' ? (log.background_sound ? 'Yes' : 'No') : N_A;
            modalVadMinSilenceEl.textContent = log.vad_min_silence !== undefined && log.vad_min_silence !== null ? `${parseFloat(log.vad_min_silence).toFixed(2)}s` : N_A;
            modalAllowInterruptionsEl.textContent = typeof log.allow_interruptions === 'boolean' ? (log.allow_interruptions ? 'Yes' : 'No') : N_A;
            
            const totalCostPerMin = (log.duration_seconds > 0 && log.total_cost_usd !== undefined) ? (log.total_cost_usd / (log.duration_seconds / 60)).toFixed(5) : N_A;
            modalTotalCostPerMinEl.textContent = totalCostPerMin;

            // Transcript
            modalConversationTranscriptEl.innerHTML = '';
            if (log.transcript && Array.isArray(log.transcript) && log.transcript.length > 0) {
                log.transcript.forEach(item => {
                    const messageDiv = document.createElement('div');
                    messageDiv.classList.add('transcript-entry', item.role && item.role.toLowerCase() === 'user' ? 'transcript-user' : 'transcript-assistant');
                    
                    const roleSpan = document.createElement('span');
                    roleSpan.classList.add('transcript-role');
                    roleSpan.textContent = `${item.role || 'Unknown'}:`;
                    
                    const messageP = document.createElement('p');
                    messageP.textContent = item.content || item.message || '';

                    messageDiv.appendChild(roleSpan);
                    messageDiv.appendChild(messageP);
                    modalConversationTranscriptEl.appendChild(messageDiv);
                });
            } else {
                modalConversationTranscriptEl.innerHTML = '<p class="text-muted p-2 text-center">No transcript available.</p>';
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
                modalAudioPlayerContainerEl.appendChild(modalNoAudioMessageEl);
            }

            callDetailModalEl.show();
        } catch (error) {
            console.error('Error displaying log details:', error);
            fetchErrorMessageEl.textContent = `Error displaying log details: ${error.message}. Please try again later.`;
            fetchErrorMessageEl.style.display = 'block';
            callDetailModalEl.hide();
        }
    }
    
    // --- MOCK DATA GENERATION (for testing without backend) ---
    function generateMockLogs(count, startDateStr, endDateStr) {
        const logs = [];
        const start = new Date(startDateStr);
        const end = new Date(endDateStr);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        const sttLangs = ['en-IN', 'hi-IN', 'en-US', 'bn-IN', 'ta-IN'];
        const llmModels = ['gpt-3.5-turbo', 'claude-2', 'gemini-pro', 'gpt-4'];
        const ttsProviders = ['aws-polly', 'google-tts', 'elevenlabs'];
        const sttProviders = ['google-stt', 'aws-transcribe', 'deepgram'];
        const llmProviders = ['openai', 'anthropic', 'google'];
        const ttsVoices = ['Joanna', 'Matthew', 'Aditi', 'Raveena', 'Nicole', 'Russell'];


        for (let i = 0; i < count; i++) {
            const randomDayOffset = Math.floor(Math.random() * (diffDays + 1));
            const callDate = new Date(start);
            callDate.setDate(start.getDate() + randomDayOffset);
            callDate.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60), Math.floor(Math.random() * 60));

            const duration_seconds = Math.floor(Math.random() * 300) + 30; // 30s to 5m30s
            const cost_stt_usd = Math.random() * 0.1 * (duration_seconds / 60);
            const cost_llm_usd = Math.random() * 0.5 * (duration_seconds / 60);
            const cost_tts_usd = Math.random() * 0.05 * (duration_seconds / 60);
            const total_cost_usd = cost_stt_usd + cost_llm_usd + cost_tts_usd;

            logs.push({
                id: `mock_${i}_${Date.now()}`,
                call_timestamp_utc: callDate.toISOString(),
                phone_number: `+9198765${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`,
                duration_seconds: duration_seconds,
                stt_language: sttLangs[Math.floor(Math.random() * sttLangs.length)],
                llm_model: llmModels[Math.floor(Math.random() * llmModels.length)],
                tts_provider: ttsProviders[Math.floor(Math.random() * ttsProviders.length)],
                stt_provider: sttProviders[Math.floor(Math.random() * sttProviders.length)],
                llm_provider: llmProviders[Math.floor(Math.random() * llmProviders.length)],
                tts_voice: ttsVoices[Math.floor(Math.random() * ttsVoices.length)],
                use_retrieval: Math.random() > 0.5,
                cost_stt_usd: cost_stt_usd,
                cost_llm_usd: cost_llm_usd,
                cost_tts_usd: cost_tts_usd,
                total_cost_usd: total_cost_usd,
                system_prompt: "You are a helpful assistant.",
                first_message: "Hello, how can I help you today?",
                // Mock transcript
                transcript: [
                    { role: 'user', content: 'Hello there.' },
                    { role: 'assistant', message: 'Hi! How can I assist you?' },
                    { role: 'user', content: 'I have a question about my bill.'}
                ],
                audio_url: null // No mock audio URL by default
                // Add other fields as needed by the modal, e.g., stt_model, llm_temperature etc.
            });
        }
        return logs;
    }
    // --- END MOCK DATA ---


    initialize();
});