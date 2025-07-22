import { SystemContext } from "~/system-context";
import { getNextAction } from "~/next-action";

// Test function to verify getNextAction works correctly
async function testGetNextAction() {
  console.log("Testing getNextAction function...");
  
  // Create a mock system context
  const context = new SystemContext();
  
  try {
    // Test with empty context
    console.log("Test 1: Empty context");
    const action1 = await getNextAction(context);
    console.log("Action 1:", action1);
    
    // Test with some query history
    console.log("\nTest 2: With query history");
    // @ts-ignore - accessing private property for testing
    context.queryHistory = [
      {
        query: "What is the latest news about AI?",
        results: [
          {
            date: "2024-01-15",
            title: "Latest AI breakthrough announced",
            url: "https://example.com/ai-news",
            snippet: "Scientists have made a major breakthrough in AI research..."
          }
        ]
      }
    ];
    
    const action2 = await getNextAction(context);
    console.log("Action 2:", action2);
    
    // Test with scrape history
    console.log("\nTest 3: With scrape history");
    // @ts-ignore - accessing private property for testing
    context.scrapeHistory = [
      {
        url: "https://example.com/ai-news",
        result: "Full article content about AI breakthrough..."
      }
    ];
    
    const action3 = await getNextAction(context);
    console.log("Action 3:", action3);
    
    console.log("\n✅ All tests completed successfully!");
    
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testGetNextAction();
}

export { testGetNextAction };