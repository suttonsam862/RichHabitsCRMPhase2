#!/bin/bash

# Test script for the enhanced create-org API endpoint
# Tests validation, error handling, and successful creation

BASE_URL="${API_BASE_URL:-http://localhost:5000}"
API_ENDPOINT="$BASE_URL/api/organizations"

echo "🚀 Testing Create Organization API at $API_ENDPOINT"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
PASS_COUNT=0
FAIL_COUNT=0

# Helper function to run test
run_test() {
    local test_name="$1"
    local payload="$2"
    local expected_status="$3"
    local content_type="${4:-application/json}"
    
    echo -e "${BLUE}Testing: $test_name${NC}"
    
    # Make the request
    response=$(curl -s -w "\n%{http_code}" -X POST \
        -H "Content-Type: $content_type" \
        -d "$payload" \
        "$API_ENDPOINT")
    
    # Extract status code and body
    status_code=$(echo "$response" | tail -n1)
    response_body=$(echo "$response" | head -n -1)
    
    # Check if test passed
    if [ "$status_code" = "$expected_status" ]; then
        echo -e "✅ ${GREEN}PASS${NC} - Status: $status_code"
        ((PASS_COUNT++))
        
        # Show created organization details for successful creations
        if [ "$status_code" = "201" ]; then
            org_name=$(echo "$response_body" | grep -o '"name":"[^"]*"' | cut -d'"' -f4)
            org_id=$(echo "$response_body" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
            echo -e "   ${GREEN}Created:${NC} $org_name (ID: $org_id)"
        fi
    else
        echo -e "❌ ${RED}FAIL${NC} - Expected: $expected_status, Got: $status_code"
        echo -e "   ${YELLOW}Response:${NC} $response_body"
        ((FAIL_COUNT++))
    fi
    echo ""
}

# Test Cases

echo "=== Valid Organization Tests ==="

# Test 1: Valid Business Organization
run_test "Valid Business Organization" '{
    "name": "Acme Corporation",
    "logo_url": "https://example.com/logo.png",
    "state": "CA",
    "address": "123 Business Ave, San Francisco, CA 94105",
    "phone": "+1 (555) 123-4567",
    "email": "contact@acmecorp.com",
    "is_business": true,
    "notes": "Premium client with custom requirements",
    "universal_discounts": {
        "bulk_order": 15,
        "repeat_customer": 10
    }
}' "201"

# Test 2: Valid Individual
run_test "Valid Individual Organization" '{
    "name": "Jane Smith",
    "state": "NY",
    "phone": "555-987-6543",
    "email": "jane.smith@email.com",
    "is_business": false,
    "notes": "Individual customer - prefers email contact"
}' "201"

# Test 3: Minimal Valid Organization
run_test "Minimal Valid Organization" '{
    "name": "Simple Org",
    "is_business": false
}' "201"

echo "=== Validation Error Tests ==="

# Test 4: Missing Required Name
run_test "Missing Required Name" '{
    "state": "TX",
    "is_business": true
}' "400"

# Test 5: Empty Name After Trim
run_test "Empty Name After Trim" '{
    "name": "   ",
    "is_business": false
}' "400"

# Test 6: Invalid Email Format
run_test "Invalid Email Format" '{
    "name": "Test Org",
    "email": "invalid-email",
    "is_business": false
}' "400"

# Test 7: Invalid State Code
run_test "Invalid State Code" '{
    "name": "Test Org",
    "state": "XX",
    "is_business": false
}' "400"

# Test 8: Phone Too Short
run_test "Phone Too Short" '{
    "name": "Test Org",
    "phone": "123",
    "is_business": false
}' "400"

# Test 9: Invalid Phone Characters
run_test "Invalid Phone Characters" '{
    "name": "Test Org",
    "phone": "555-123-ABCD",
    "is_business": false
}' "400"

# Test 10: Invalid Logo URL
run_test "Invalid Logo URL" '{
    "name": "Test Org",
    "logo_url": "not-a-url",
    "is_business": false
}' "400"

# Test 11: Invalid Content Type
run_test "Invalid Content Type" '{
    "name": "Test Org",
    "is_business": false
}' "400" "text/plain"

echo "=== Duplicate Name Test ==="

# Test 12: Duplicate organization name (should fail after first creation)
run_test "Duplicate Organization Name" '{
    "name": "Acme Corporation",
    "is_business": true
}' "409"

echo "=== Test Summary ==="
TOTAL_TESTS=$((PASS_COUNT + FAIL_COUNT))
SUCCESS_RATE=$(( (PASS_COUNT * 100) / TOTAL_TESTS ))

echo -e "${GREEN}✅ Passed: $PASS_COUNT${NC}"
echo -e "${RED}❌ Failed: $FAIL_COUNT${NC}"
echo -e "${BLUE}📈 Success Rate: $SUCCESS_RATE%${NC}"

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "\n🎉 ${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "\n⚠️  ${YELLOW}Some tests failed. Check the output above.${NC}"
    exit 1
fi