document.addEventListener('DOMContentLoaded', function () {
    // API base URL
    const API_BASE_URL = 'https://stackvoice-telephonic-agent-api-fqb2ezg0c2c0d6f4.southindia-01.azurewebsites.net';

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
            const response = await fetch(`${API_BASE_URL}/get_call_logs`, {
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    start_date: new Date(fromDate).toISOString(),
                    end_date: new Date(toDate).toISOString()
                })
            });

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

    // Cost dictionary for per-minute rates
    const costsPerMin = {
        "STT": {
            "azure:default": 0.00835,             
            "sarvam:saarika:v2": 0.00305,         
            "sarvam:saarika:v1": 0.00305,         
            "sarvam:saarika:flash": 0.00305,      
            "deepgram:nova-2-general": 0.00290,   
            "deepgram:nova-3-general": 0.00385,   
            "google:default": 0.00800,            
            "google:command_and_search": 0.01200, 
            "openai:whisper-1": 0.00300,
            "iitm:ccc-wav2vec-2.0": 0.000,
            "groq:whisper-large-v3-turbo": 0.000333,
            "groq:distil-whisper-large-v3-en": 0.000167,
            "groq:whisper-large-v3": 0.000925,      
        },
        "LLM": {
            "openai:gpt-4o": 0.0295,
            "openai:gpt-4o-mini": 0.00093,
            "openai:gpt-4.1": 0.0124,
            "openai:gpt-4.1-mini": 0.00248,
            "openai:gpt-4.1-nano": 0.00062,
            
            "deepseek:deepseek-v3": 0.0000784,
            "deepseek:deepseek-r1": 0.003407,
            
            "google:gemini-2.5-flash-preview-04-17": 0.00093,
            "google:gemini-2.5-pro-preview-05-06":  0.00925,
            "google:gemini-2.0-flash":              0.00062,
            "google:gemini-2.0-flash-lite":         0.00062,
            "google:gemini-1.5-flash":              0.002065,
            "google:gemini-1.5-flash-8b":           0.0002325,
            "google:gemini-1.5-pro":                0.02065,
            
            "groq:gemma2-9b-it": 0.00106,
            "groq:llama-3.3-70b-versatile": 0.003187,
            "groq:llama-3.1-8b-instant": 0.000274,
            "groq:llama3-70b-8192": 0.003187,
            "groq:llama3-8b-8192": 0.000274,
            "groq:deepseek-r1-distill-llama-70b": 0.004047,
            "groq:mistral-saba-24b": 0.004187,
            "groq:qwen-qwq-32b": 0.001567,
            "groq:meta-llama/llama-4-maverick-17b-128e-instruct": 0.00118,
            "groq:meta-llama/llama-4-scout-17b-16e-instruct": 0.000652,
            "groq:meta-llama/Llama-Guard-4-12B": 0.00106,
            
            "togetherai:Qwen/Qwen3-235B-A22B-fp8-tput":                    0.00118,
            "togetherai:meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8": 0.001605,
            "togetherai:meta-llama/Llama-4-Scout-17B-16E-Instruct":         0.001077,
            "togetherai:deepseek-ai/DeepSeek-R1":                          0.01710,
            "togetherai:deepseek-ai/DeepSeek-V3":                          0.006625,
            "togetherai:deepseek-ai/DeepSeek-R1-Distill-Llama-70B":        0.01060,
            "togetherai:deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B":         0.000954,
            "togetherai:deepseek-ai/DeepSeek-R1-Distill-Qwen-14B":          0.00848,
            "togetherai:perplexity-ai/r1-1776":                            0.01710,
            "togetherai:marin-community/marin-8b-instruct":                0.000954,
            "togetherai:mistralai/Mistral-Small-24B-Instruct-2501":        0.00424,
            "togetherai:meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo":       0.000954,
            "togetherai:meta-llama/Llama-3.3-70B-Instruct-Turbo":           0.004664,
            "togetherai:nvidia/Llama-3.1-Nemotron-70B-Instruct-HF":        0.004664,
            "togetherai:Qwen/Qwen2.5-7B-Instruct-Turbo":                    0.00159,
            "togetherai:Qwen/Qwen2.5-72B-Instruct-Turbo":                  0.00636,
            "togetherai:Qwen/Qwen2.5-VL-72B-Instruct":                     0.004135,
            "togetherai:Qwen/Qwen2.5-Coder-32B-Instruct":                  0.00424,
            "togetherai:Qwen/QwQ-32B":                                     0.00636,
            "togetherai:Qwen/Qwen2-72B-Instruct":                          0.00477,
            "togetherai:Qwen/Qwen2-VL-72B-Instruct":                       0.00636,
            "togetherai:arcee-ai/virtuoso-medium-v2":                      0.00265,
            "togetherai:arcee-ai/coder-large":                             0.00265,
            "togetherai:arcee-ai/virtuoso-large":                          0.00390,
            "togetherai:arcee-ai/maestro-reasoning":                       0.00459,
            "togetherai:arcee-ai/caller":                                  0.00199,
            "togetherai:arcee-ai/arcee-blitz":                             0.002475,
            "togetherai:meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo":     0.01855,
            "togetherai:meta-llama/Llama-3.2-3B-Instruct-Turbo":            0.000318,
            "togetherai:meta-llama/Meta-Llama-3-8B-Instruct-Lite":          0.00053,
            "togetherai:meta-llama/Llama-3-8b-chat-hf":                     0.00053,
            "togetherai:meta-llama/Llama-3-70b-chat-hf":                    0.004664,
            "togetherai:google/gemma-2-27b-it":                             0.00424,
            "togetherai:google/gemma-2b-it":                                0.00053,
            "togetherai:Gryphe/MythoMax-L2-13b":                            0.00053,
            "togetherai:mistralai/Mistral-7B-Instruct-v0.1":                0.00106,
            "togetherai:mistralai/Mistral-7B-Instruct-v0.2":                0.00106,
            "togetherai:mistralai/Mistral-7B-Instruct-v0.3":                0.00106,
            "togetherai:NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO":       0.00318,
        },
        "TTS": {
            "azure": 0.03,        
            "sarvam": 0.036585,   
            "elevenlabs": 0.36,   
            "cartesia": 0.015,
            "groq": 0.0600,   
            "resemble": 0.0375,
        }
    };
    

    // Helper function to get cost per minute for a service
    function getCostPerMinute(service, model) {
        if (!model) return 0;
        
        // Normalize model name to lowercase for case-insensitive matching
        const normalizedModel = model.toLowerCase();
        
        // Search for the model in the cost dictionary
        const serviceCosts = costsPerMin[service];
        if (!serviceCosts) return 0;

        // For TTS, just use the provider
        if (service === "TTS") {
            return serviceCosts[normalizedModel] || 0;
        }

        // For STT and LLM, use provider:model format
        // Try exact match first
        if (serviceCosts[normalizedModel]) {
            return serviceCosts[normalizedModel];
        }

        // Try case-insensitive match
        for (const [key, value] of Object.entries(serviceCosts)) {
            if (key.toLowerCase() === normalizedModel) {
                return value;
            }
        }

        // Try partial match
        for (const [key, value] of Object.entries(serviceCosts)) {
            if (normalizedModel.includes(key.toLowerCase()) || key.toLowerCase().includes(normalizedModel)) {
                return value;
            }
        }

        console.warn(`No cost found for ${service} model: ${model}`);
        return 0;
    }

    function processAndDisplayLogs(logs) {
        console.log("%c=== Processing Logs ===", "background: #4CAF50; color: white; padding: 2px 5px;");
        console.log("Number of logs to process:", logs.length);
        
        logs.forEach((log, index) => {
            console.log(`%cProcessing log ${index + 1}:`, "font-weight: bold; color: #4CAF50;");
            console.log("Raw log data:", log);
            
            // Ensure log has an ID
            if (!log.id || log.id === 'call_NaN_duqfswibp') {
                log.id = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            }

            // Process timestamp and convert to IST
            try {
                // Get timestamp from call_timestamps.start
                const timestampStr = log.call_timestamps?.start;
                
                if (timestampStr) {
                    // Parse the ISO string with timezone
                    const date = new Date(timestampStr);
                    if (isNaN(date.getTime())) {
                        throw new Error('Invalid timestamp value');
                    }
                    log.call_datetime_ist = date;
                    
                    // Format date and time in 24-hour format
                    log.call_timestamp_ist_display = date.toLocaleDateString('en-CA');
                    const hours = date.getHours().toString().padStart(2, '0');
                    const minutes = date.getMinutes().toString().padStart(2, '0');
                    const seconds = date.getSeconds().toString().padStart(2, '0');
                    log.call_time_ist_display = `${hours}:${minutes}:${seconds}`;
                } else {
                    throw new Error('No timestamp available');
                }
            } catch (error) {
                console.error(`Error processing timestamp for log ${index}:`, error);
                const now = new Date();
                log.call_datetime_ist = now;
                log.call_timestamp_ist_display = now.toLocaleDateString('en-CA');
                const hours = now.getHours().toString().padStart(2, '0');
                const minutes = now.getMinutes().toString().padStart(2, '0');
                const seconds = now.getSeconds().toString().padStart(2, '0');
                log.call_time_ist_display = `${hours}:${minutes}:${seconds}`;
            }

            // Process duration from call_duration
            if (log.call_duration) {
                log.duration_seconds = parseFloat(log.call_duration.total_seconds) || 0;
                log.duration_minutes = log.call_duration.minutes || 0;
                log.duration_seconds_remainder = log.call_duration.seconds || 0;
                log.duration_display = `${log.duration_minutes}:${log.duration_seconds_remainder.toString().padStart(2, '0')} (${log.duration_seconds.toFixed(2)}s)`;
            } else {
                log.duration_seconds = parseFloat(log.duration_seconds) || 0;
                const minutes = Math.floor(log.duration_seconds / 60);
                const seconds = Math.floor(log.duration_seconds % 60);
                log.duration_display = `${minutes}:${seconds.toString().padStart(2, '0')} (${log.duration_seconds.toFixed(2)}s)`;
            }

            // Process metadata if available
            if (log.metadata) {
                // LLM related fields
                log.llm_model = log.metadata.LLM_model || 'N/A';
                log.llm_provider = log.metadata.LLM_provider || 'N/A';
                log.system_prompt = log.metadata.LLM_system_prompt || 'N/A';
                log.llm_temperature = parseFloat(log.metadata.LLM_temperature) || 0.7;

                // STT related fields
                log.stt_language = log.metadata.STT_language || 'en-IN';
                log.stt_model = log.metadata.STT_model || 'default';
                log.stt_provider = log.metadata.STT_provider || 'N/A';

                // TTS related fields
                log.tts_language = log.metadata.TTS_language || log.stt_language;
                log.tts_provider = log.metadata.TTS_provider || 'N/A';
                log.tts_voice = log.metadata.TTS_voice || 'N/A';

                // Call configuration fields
                log.phone_number = log.metadata.phone_number || 'N/A';
                log.auto_end_call = log.metadata.auto_end_call || false;
                log.background_sound = log.metadata.background_sound || false;
                log.vad_min_silence = parseFloat(log.metadata.vad_min_silence) || 0;
                log.allow_interruptions = log.metadata.is_allow_interruptions || false;
                log.use_retrieval = log.metadata.use_retrieval || false;
                log.first_message = log.metadata.first_message || 'N/A';
            }

            // Calculate costs based on duration and models
            const durationMinutes = log.duration_seconds / 60;
            
            // Get cost per minute for each service using provider:model format
            const sttCostPerMin = getCostPerMinute("STT", `${log.stt_provider}:${log.stt_model}`);
            console.log("sttCostPerMin", sttCostPerMin);
            const llmCostPerMin = getCostPerMinute("LLM", `${log.llm_provider}:${log.llm_model}`);
            console.log("llmCostPerMin", llmCostPerMin);
            const ttsCostPerMin = getCostPerMinute("TTS", log.tts_provider);
            console.log("ttsCostPerMin", ttsCostPerMin);
            
            // Calculate total costs
            log.cost_stt_usd = sttCostPerMin * durationMinutes;
            log.cost_llm_usd = llmCostPerMin * durationMinutes;
            log.cost_tts_usd = ttsCostPerMin * durationMinutes;
            log.total_cost_usd = log.cost_stt_usd + log.cost_llm_usd + log.cost_tts_usd;

            // Process display values
            log.phone_number_display = log.phone_number || 'N/A';
            log.stt_language_display = getLanguageName(log.stt_language || 'en-IN');
            log.llm_model_display = log.llm_model || 'N/A';

            // Process transcript if available
            if (log.conversation_transcript) {
                log.transcript = log.conversation_transcript;
            }

            // Process audio URL if available
            if (log.audio_file?.sas_url) {
                log.audio_url = log.audio_file.sas_url;
            }

            // Log the processed values for debugging
            console.log("After processing - Processed values:", {
                call_timestamp_ist_display: log.call_timestamp_ist_display,
                call_time_ist_display: log.call_time_ist_display,
                duration_minutes: log.duration_minutes,
                total_cost_usd: log.total_cost_usd,
                stt_language_display: log.stt_language_display,
                llm_model_display: log.llm_model_display,
                metadata_fields: {
                    llm_model: log.llm_model,
                    llm_provider: log.llm_provider,
                    stt_model: log.stt_model,
                    stt_provider: log.stt_provider,
                    tts_provider: log.tts_provider
                }
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
            // Format date as YYYY-MM-DD without using toISOString
            const date = log.call_datetime_ist.toLocaleDateString('en-CA');
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
            // Format date as YYYY-MM-DD without using toISOString
            const date = log.call_datetime_ist.toLocaleDateString('en-CA');
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
            if (dateFilter && log.call_datetime_ist.toLocaleDateString('en-CA') !== dateFilter) passes = false;
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
            row.insertCell().textContent = log.duration_display;
            row.insertCell().textContent = log.phone_number_display;
            row.insertCell().textContent = log.stt_language_display;
            row.insertCell().textContent = log.llm_model_display;
            row.insertCell().textContent = `$${(log.total_cost_usd || 0).toFixed(4)}`;

            const actionsCell = row.insertCell();
            actionsCell.classList.add('text-center');
            const viewButton = document.createElement('button');
            viewButton.classList.add('btn', 'btn-sm', 'btn-outline-primary');
            viewButton.innerHTML = '<i class="fas fa-eye"></i>';
            viewButton.title = "View Details";
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
            const N_A = "N/A";

            // Format date and time for modal using call_timestamps
            const startDate = new Date(log.call_timestamps?.start);
            const endDate = new Date(log.call_timestamps?.end);
            
            modalCallDateEl.textContent = startDate.toLocaleDateString('en-CA') || N_A;
            
            // Format start time in 24-hour format
            const startHours = startDate.getHours().toString().padStart(2, '0');
            const startMinutes = startDate.getMinutes().toString().padStart(2, '0');
            const startSeconds = startDate.getSeconds().toString().padStart(2, '0');
            modalCallStartTimeEl.textContent = `${startHours}:${startMinutes}:${startSeconds}`;
            
            // Format end time in 24-hour format
            const endHours = endDate.getHours().toString().padStart(2, '0');
            const endMinutes = endDate.getMinutes().toString().padStart(2, '0');
            const endSeconds = endDate.getSeconds().toString().padStart(2, '0');
            modalCallEndTimeEl.textContent = `${endHours}:${endMinutes}:${endSeconds}`;

            // Format duration using call_duration
            if (log.call_duration) {
                modalDurationEl.textContent = `${log.call_duration.minutes}:${log.call_duration.seconds.toString().padStart(2, '0')} (${log.call_duration.total_seconds.toFixed(2)}s)`;
            } else {
                modalDurationEl.textContent = log.duration_display || N_A;
            }

            // Basic call info
            modalPhoneNumberEl.textContent = log.phone_number || N_A;
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