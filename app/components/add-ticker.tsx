import { useState } from "react";
import { Form, useSubmit, useNavigation } from "react-router";

export function AddTicker() {
  const [symbol, setSymbol] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSubmitting = navigation.formAction === "/";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!symbol.trim()) return;
    
    const formData = new FormData();
    formData.append("action", "add-ticker");
    formData.append("symbol", symbol.toUpperCase().trim());
    
    submit(formData, { method: "post" });
    
    // Reset form
    setSymbol("");
    setIsExpanded(false);
  };

  const handleCancel = () => {
    setSymbol("");
    setIsExpanded(false);
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add Ticker
      </button>
    );
  }

  return (
    <Form onSubmit={handleSubmit} className="inline-flex items-center space-x-2">
      <input
        type="text"
        value={symbol}
        onChange={(e) => setSymbol(e.target.value.toUpperCase())}
        placeholder="Enter symbol (e.g., MSFT)"
        className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        maxLength={10}
        required
        disabled={isSubmitting}
        autoFocus
      />
      <button
        type="submit"
        disabled={!symbol.trim() || isSubmitting}
        className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : (
          "Add"
        )}
      </button>
      <button
        type="button"
        onClick={handleCancel}
        className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        disabled={isSubmitting}
      >
        Cancel
      </button>
    </Form>
  );
}