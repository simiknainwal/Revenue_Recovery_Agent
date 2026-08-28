import { useEffect, useState } from "react";
import "./App.css";

function App() {
    const [cases, setCases] = useState([]);
    const [loading, setLoading] = useState(true);

    const [selectedCase, setSelectedCase] = useState(null);

    const [attempts, setAttempts] = useState([]);
    const [interactions, setInteractions] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    const [agentRunning, setAgentRunning] = useState(false);
    const [agentMessage, setAgentMessage] = useState("");

    const [customerMessage, setCustomerMessage] = useState("");
    const [messageProcessing, setMessageProcessing] = useState(false);
    const [messageResult, setMessageResult] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
const [statusFilter, setStatusFilter] = useState("ALL");
const [riskFilter, setRiskFilter] = useState("ALL");
const [sortOrder, setSortOrder] = useState("NONE");

    const fetchCases = async () => {
        try {
            const response = await fetch(
                "http://localhost:5000/api/recovery-cases"
            );

            if (!response.ok) {
                throw new Error("Failed to fetch recovery cases");
            }

            const data = await response.json();

            setCases(data.data || []);

            return data.data || [];
        } catch (error) {
            console.error("Error:", error);
            return [];
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
    fetch("http://localhost:5000/api/recovery-cases")
        .then(response => {
            if (!response.ok) {
                throw new Error("Failed to fetch recovery cases");
            }

            return response.json();
        })
        .then(data => {
            setCases(data.data || []);
        })
        .catch(error => {
            console.error("Error:", error);
        })
        .finally(() => {
            setLoading(false);
        });
}, []);

    const fetchCaseHistory = async (caseId) => {
        setHistoryLoading(true);

        try {
            const response = await fetch(
                `http://localhost:5000/api/recovery-cases/${caseId}/history`
            );

            if (!response.ok) {
                throw new Error("Failed to fetch case history");
            }

            const data = await response.json();

            setAttempts(data.attempts || []);
            setInteractions(data.interactions || []);
        } catch (error) {
            console.error("History error:", error);

            setAttempts([]);
            setInteractions([]);
        } finally {
            setHistoryLoading(false);
        }
    };

    const openCase = async (item) => {
        setSelectedCase(item);

        setAttempts([]);
        setInteractions([]);

        setCustomerMessage("");
        setMessageResult("");

        await fetchCaseHistory(item.CASE_ID);
    };

    const runAgentNow = async () => {
        setAgentRunning(true);
        setAgentMessage("");

        try {
            const response = await fetch(
                "http://localhost:5000/api/agent/process-due-cases",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );

            if (!response.ok) {
                throw new Error("Failed to run recovery agent");
            }

            const data = await response.json();

            setAgentMessage(
                `Agent completed. ${
                    data.totalDueCases || 0
                } due case(s) processed.`
            );

            const updatedCases = await fetchCases();

            if (selectedCase) {
                const updatedSelectedCase = updatedCases.find(
                    item => item.CASE_ID === selectedCase.CASE_ID
                );

                if (updatedSelectedCase) {
                    setSelectedCase(updatedSelectedCase);
                }

                await fetchCaseHistory(selectedCase.CASE_ID);
            }
        } catch (error) {
            console.error("Agent error:", error);

            setAgentMessage(
                "Agent execution failed. Check the backend console."
            );
        } finally {
            setAgentRunning(false);
        }
    };

    const processCustomerMessage = async () => {
        if (!customerMessage.trim() || !selectedCase) {
            return;
        }

        setMessageProcessing(true);
        setMessageResult("");

        try {
            const response = await fetch(
                `http://localhost:5000/api/recovery-cases/${selectedCase.CASE_ID}/message`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        message: customerMessage
                    })
                }
            );

            if (!response.ok) {
                throw new Error("Failed to process customer message");
            }

            const data = await response.json();

            console.log("Message result:", data);

            setMessageResult(
                "Customer response processed successfully."
            );

            setCustomerMessage("");

            const updatedCases = await fetchCases();

            const updatedSelectedCase = updatedCases.find(
                item => item.CASE_ID === selectedCase.CASE_ID
            );

            if (updatedSelectedCase) {
                setSelectedCase(updatedSelectedCase);
            }

            await fetchCaseHistory(selectedCase.CASE_ID);
        } catch (error) {
            console.error("Message processing error:", error);

            setMessageResult(
                "Failed to process customer response."
            );
        } finally {
            setMessageProcessing(false);
        }
    };

    const closeCasePanel = () => {
        setSelectedCase(null);

        setAttempts([]);
        setInteractions([]);

        setCustomerMessage("");
        setMessageResult("");
    };

    const activeCases = cases.filter(
        item =>
            item.STATUS === "OPEN" ||
            item.STATUS === "IN_PROGRESS"
    ).length;

    const recoveredCases = cases.filter(
        item => item.STATUS === "RECOVERED"
    ).length;

    const promisedCases = cases.filter(
        item => item.STATUS === "PROMISED"
    ).length;

    const highRiskCases = cases.filter(
        item => item.RISK_SCORE >= 80
    ).length;

const filteredCases = cases
    .filter(item => {
        const matchesSearch =
            item.CUSTOMER_NAME
                ?.toLowerCase()
                .includes(searchTerm.toLowerCase()) ||
            String(item.CASE_ID).includes(searchTerm);

        const matchesStatus =
            statusFilter === "ALL" ||
            item.STATUS === statusFilter;

        let matchesRisk = true;

        if (riskFilter === "HIGH") {
            matchesRisk = item.RISK_SCORE >= 80;
        } else if (riskFilter === "MEDIUM") {
            matchesRisk =
                item.RISK_SCORE >= 70 &&
                item.RISK_SCORE < 80;
        } else if (riskFilter === "LOW") {
            matchesRisk = item.RISK_SCORE < 70;
        }

        return (
            matchesSearch &&
            matchesStatus &&
            matchesRisk
        );
    })
    .sort((a, b) => {
        if (sortOrder === "HIGH_TO_LOW") {
            return b.RISK_SCORE - a.RISK_SCORE;
        }

        if (sortOrder === "LOW_TO_HIGH") {
            return a.RISK_SCORE - b.RISK_SCORE;
        }

        return 0;
    });

    if (loading) {
        return (
            <p className="loading-text">
                Loading dashboard...
            </p>
        );
    }

    return (
        <div className="dashboard">

            <header className="header">

                <div>
                    <h1>Revenue Recovery Agent</h1>

                    <p>
                        Monitor and manage automated revenue recovery cases
                    </p>
                </div>

                <button
                    className="run-agent-btn"
                    onClick={runAgentNow}
                    disabled={agentRunning}
                >
                    {agentRunning
                        ? "Running Agent..."
                        : "Run Agent Now"}
                </button>

            </header>

            {agentMessage && (
                <div className="agent-message">
                    {agentMessage}
                </div>
            )}

            <section className="stats">

                <div className="stat-card">
                    <p>Active Cases</p>
                    <h2>{activeCases}</h2>
                </div>

                <div className="stat-card">
                    <p>Recovered</p>
                    <h2>{recoveredCases}</h2>
                </div>

                <div className="stat-card">
                    <p>Promises</p>
                    <h2>{promisedCases}</h2>
                </div>

                <div className="stat-card">
                    <p>High Risk</p>
                    <h2>{highRiskCases}</h2>
                </div>

            </section>

            <section className="cases-section">

                <div className="section-header">

    <div>
        <h2>Recovery Cases</h2>
        <p>Search and filter recovery cases</p>
    </div>

    <div className="case-filters">

        <input
            type="text"
            className="search-input"
            placeholder="Search customer or case ID..."
            value={searchTerm}
            onChange={event =>
                setSearchTerm(event.target.value)
            }
        />

        <select
            className="status-filter"
            value={statusFilter}
            onChange={event =>
                setStatusFilter(event.target.value)
            }
        >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">
                In Progress
            </option>
            <option value="PROMISED">
                Promised
            </option>
            <option value="RECOVERED">
                Recovered
            </option>
            <option value="CLOSED">
                Closed
            </option>
        </select>

        <select
    className="risk-filter"
    value={riskFilter}
    onChange={event =>
        setRiskFilter(event.target.value)
    }
>
    <option value="ALL">All Risk Levels</option>
    <option value="HIGH">High Risk (80+)</option>
    <option value="MEDIUM">Medium Risk (70-79)</option>
    <option value="LOW">Low Risk (&lt;70)</option>
</select>

<select
    className="sort-filter"
    value={sortOrder}
    onChange={event =>
        setSortOrder(event.target.value)
    }
>
    <option value="NONE">Default Order</option>
    <option value="HIGH_TO_LOW">
        Highest Risk First
    </option>
    <option value="LOW_TO_HIGH">
        Lowest Risk First
    </option>
</select>

    </div>

</div>

                <div className="table-container">

                    <table>

                        <thead>
                            <tr>
                                <th>Case</th>
                                <th>Customer</th>
                                <th>Type</th>
                                <th>Risk</th>
                                <th>Status</th>
                                <th>Next Action</th>
                            </tr>
                        </thead>

                        <tbody>

                            {filteredCases.map(item => (

                                <tr
                                    key={item.CASE_ID}
                                    onClick={() => openCase(item)}
                                    className="clickable-row"
                                >

                                    <td className="case-id">
                                        #{item.CASE_ID}
                                    </td>

                                    <td>

                                        <div className="customer-name">
                                            {item.CUSTOMER_NAME}
                                        </div>

                                        <div className="customer-email">
                                            {item.EMAIL}
                                        </div>

                                    </td>

                                    <td>
                                        {item.CASE_TYPE
                                            ? item.CASE_TYPE.replaceAll(
                                                  "_",
                                                  " "
                                              )
                                            : "—"}
                                    </td>

                                    <td>

                                        <span
                                            className={
                                                item.RISK_SCORE >= 80
                                                    ? "risk high"
                                                    : item.RISK_SCORE >= 70
                                                    ? "risk medium"
                                                    : "risk low"
                                            }
                                        >
                                            {item.RISK_SCORE}
                                        </span>

                                    </td>

                                    <td>

                                        <span
                                            className={`status ${item.STATUS.toLowerCase()}`}
                                        >
                                            {item.STATUS.replaceAll(
                                                "_",
                                                " "
                                            )}
                                        </span>

                                    </td>

                                    <td>
                                        {item.NEXT_ACTION
                                            ? item.NEXT_ACTION.replaceAll(
                                                  "_",
                                                  " "
                                              )
                                            : "—"}
                                    </td>

                                </tr>

                            ))}

                        </tbody>

                    </table>

                </div>

            </section>

            {selectedCase && (

                <div
                    className="case-detail-overlay"
                    onClick={closeCasePanel}
                >

                    <div
                        className="case-detail-panel"
                        onClick={event =>
                            event.stopPropagation()
                        }
                    >

                        <button
                            className="close-btn"
                            onClick={closeCasePanel}
                        >
                            ×
                        </button>

                        <div className="case-panel-header">

                            <p>Recovery Case</p>

                            <h2>
                                #{selectedCase.CASE_ID}
                            </h2>

                            <span
                                className={`status ${selectedCase.STATUS.toLowerCase()}`}
                            >
                                {selectedCase.STATUS.replaceAll(
                                    "_",
                                    " "
                                )}
                            </span>

                        </div>

                        <div className="detail-section">

                            <h3>Customer</h3>

                            <div className="detail-grid">

                                <div>
                                    <span>Name</span>

                                    <strong>
                                        {selectedCase.CUSTOMER_NAME}
                                    </strong>
                                </div>

                                <div>
                                    <span>Email</span>

                                    <strong>
                                        {selectedCase.EMAIL}
                                    </strong>
                                </div>

                                <div>
                                    <span>Phone</span>

                                    <strong>
                                        {selectedCase.PHONE}
                                    </strong>
                                </div>

                                <div>
                                    <span>
                                        Preferred Language
                                    </span>

                                    <strong>
                                        {
                                            selectedCase.PREFERRED_LANGUAGE
                                        }
                                    </strong>
                                </div>

                            </div>

                        </div>

                        <div className="detail-section">

                            <h3>Recovery Details</h3>

                            <div className="detail-grid">

                                <div>
                                    <span>Case Type</span>

                                    <strong>
                                        {selectedCase.CASE_TYPE
                                            ? selectedCase.CASE_TYPE.replaceAll(
                                                  "_",
                                                  " "
                                              )
                                            : "—"}
                                    </strong>
                                </div>

                                <div>
                                    <span>Risk Score</span>

                                    <strong>
                                        {selectedCase.RISK_SCORE}
                                    </strong>
                                </div>

                                <div>
                                    <span>Next Action</span>

                                    <strong>
                                        {selectedCase.NEXT_ACTION
                                            ? selectedCase.NEXT_ACTION.replaceAll(
                                                  "_",
                                                  " "
                                              )
                                            : "None"}
                                    </strong>
                                </div>

                                <div>
                                    <span>
                                        Next Action Time
                                    </span>

                                    <strong>
                                        {selectedCase.NEXT_ACTION_TIME
                                            ? new Date(
                                                  selectedCase.NEXT_ACTION_TIME
                                              ).toLocaleString()
                                            : "—"}
                                    </strong>
                                </div>

                            </div>

                        </div>

                        <div className="detail-section">

                            <h3>Reference</h3>

                            <div className="detail-grid">

                                <div>
                                    <span>Payment ID</span>

                                    <strong>
                                        {selectedCase.PAYMENT_ID ??
                                            "—"}
                                    </strong>
                                </div>

                                <div>
                                    <span>Checkout ID</span>

                                    <strong>
                                        {selectedCase.CHECKOUT_ID ??
                                            "—"}
                                    </strong>
                                </div>

                            </div>

                        </div>

                        <div className="detail-section">

                            <h3>Recovery History</h3>

                            {historyLoading ? (

                                <p className="history-message">
                                    Loading recovery history...
                                </p>

                            ) : attempts.length === 0 ? (

                                <p className="history-message">
                                    No recovery attempts yet.
                                </p>

                            ) : (

                                <div className="timeline">

                                    {attempts.map(attempt => (

                                        <div
                                            className="timeline-item"
                                            key={
                                                attempt.ATTEMPT_ID
                                            }
                                        >

                                            <div className="timeline-dot"></div>

                                            <div className="timeline-content">

                                                <div className="timeline-top">

                                                    <strong>
                                                        {attempt.ACTION
                                                            ? attempt.ACTION.replaceAll(
                                                                  "_",
                                                                  " "
                                                              )
                                                            : "Action"}
                                                    </strong>

                                                    <span>
                                                        {attempt.CHANNEL ||
                                                            "—"}
                                                    </span>

                                                </div>

                                                <p>
                                                    Result:{" "}
                                                    {attempt.RESULT ||
                                                        "—"}
                                                </p>

                                                <small>
                                                    {attempt.ATTEMPT_TIME
                                                        ? new Date(
                                                              attempt.ATTEMPT_TIME
                                                          ).toLocaleString()
                                                        : ""}
                                                </small>

                                            </div>

                                        </div>

                                    ))}

                                </div>

                            )}

                        </div>

                        <div className="detail-section">

                            <h3>Customer Interactions</h3>

                            {historyLoading ? (

                                <p className="history-message">
                                    Loading interactions...
                                </p>

                            ) : interactions.length === 0 ? (

                                <p className="history-message">
                                    No customer interactions yet.
                                </p>

                            ) : (

                                <div className="interaction-list">

                                    {interactions.map(
                                        (interaction, index) => (

                                            <div
                                                className="interaction-card"
                                                key={
                                                    interaction.INTERACTION_ID ||
                                                    index
                                                }
                                            >

                                                <div className="interaction-header">

                                                    <span>
                                                        {interaction.CHANNEL ||
                                                            "CUSTOMER"}
                                                    </span>

                                                    {(interaction.INTENT ||
                                                        interaction.DETECTED_INTENT) && (

                                                        <span className="intent-badge">

                                                            {(
                                                                interaction.INTENT ||
                                                                interaction.DETECTED_INTENT
                                                            ).replaceAll(
                                                                "_",
                                                                " "
                                                            )}

                                                        </span>

                                                    )}

                                                </div>

                                                <p>
                                                    {interaction.MESSAGE ||
                                                        interaction.CUSTOMER_MESSAGE ||
                                                        "No message available"}
                                                </p>

                                            </div>

                                        )
                                    )}

                                </div>

                            )}

                        </div>

                        <div className="detail-section">

                            <h3>
                                Simulate Customer Response
                            </h3>

                            <p className="response-description">
                                Enter a customer response to test
                                AI intent detection and recovery
                                actions.
                            </p>

                            <textarea
                                className="customer-message-input"
                                placeholder="Example: Salary Monday ko aayegi, uske baad payment kar dunga."
                                value={customerMessage}
                                onChange={event =>
                                    setCustomerMessage(
                                        event.target.value
                                    )
                                }
                                rows="4"
                            />

                            <button
                                className="process-message-btn"
                                onClick={processCustomerMessage}
                                disabled={
                                    messageProcessing ||
                                    !customerMessage.trim()
                                }
                            >
                                {messageProcessing
                                    ? "Processing..."
                                    : "Process Customer Response"}
                            </button>

                            {messageResult && (

                                <p className="message-result">
                                    {messageResult}
                                </p>

                            )}

                        </div>

                    </div>

                </div>

            )}

        </div>
    );
}

export default App;