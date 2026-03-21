require "rails_helper"

RSpec.describe "GET /api/v1/health", type: :request do
  it "returns 200 with status ok" do
    get "/api/v1/health"
    expect(response).to have_http_status(:ok)
    expect(response.parsed_body["status"]).to eq("ok")
  end

  it "also responds at /health for backward compatibility" do
    get "/health"
    expect(response).to have_http_status(:ok)
    expect(response.parsed_body["status"]).to eq("ok")
  end
end
