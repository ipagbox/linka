require "rails_helper"

RSpec.describe "Invites API", type: :request do
  let(:json) { response.parsed_body }

  describe "POST /api/v1/invites" do
    context "with default parameters (single_use)" do
      it "returns 201 with a raw token and invite metadata" do
        post "/api/v1/invites"
        expect(response).to have_http_status(:created)
        expect(json["token"]).to be_present
        expect(json["token"].length).to be >= Invite::TOKEN_MIN_LENGTH
        expect(json["invite"]["status"]).to eq("active")
        expect(json["invite"]["usage_type"]).to eq("single_use")
        expect(json["invite"]["used_count"]).to eq(0)
      end

      it "does not expose token_digest in the response" do
        post "/api/v1/invites"
        expect(json).not_to have_key("token_digest")
        expect(json["invite"]).not_to have_key("token_digest")
      end
    end

    context "with multi_use parameters" do
      it "creates a multi_use invite with max_uses" do
        post "/api/v1/invites", params: { usage_type: "multi_use", max_uses: 10 }
        expect(response).to have_http_status(:created)
        expect(json["invite"]["usage_type"]).to eq("multi_use")
        expect(json["invite"]["max_uses"]).to eq(10)
      end
    end

    context "with expiration" do
      it "creates an invite with expires_at" do
        expires = 7.days.from_now.iso8601
        post "/api/v1/invites", params: { expires_at: expires }
        expect(response).to have_http_status(:created)
        expect(json["invite"]["expires_at"]).to be_present
      end
    end

    context "with a note" do
      it "stores the note on the invite" do
        post "/api/v1/invites", params: { note: "For Alice" }
        expect(response).to have_http_status(:created)
        expect(json["invite"]["note"]).to eq("For Alice")
      end
    end

    context "with invalid parameters" do
      it "returns 422 when multi_use has no max_uses" do
        post "/api/v1/invites", params: { usage_type: "multi_use" }
        expect(response).to have_http_status(:unprocessable_entity)
        expect(json["error"]).to be_present
        expect(json["code"]).to eq("validation_error")
      end

      it "returns 422 when max_uses is zero" do
        post "/api/v1/invites", params: { usage_type: "multi_use", max_uses: 0 }
        expect(response).to have_http_status(:unprocessable_entity)
        expect(json["code"]).to eq("validation_error")
      end
    end
  end

  describe "GET /api/v1/invites/:token" do
    context "with a valid, usable invite" do
      let(:raw_token) { Invite.generate_raw_token }
      let!(:invite) { create(:invite, token_digest: Invite.digest_token(raw_token)) }

      it "returns usable: true with invite state" do
        get "/api/v1/invites/#{raw_token}"
        expect(response).to have_http_status(:ok)
        expect(json["usable"]).to be true
        expect(json["status"]).to eq("active")
        expect(json["usage_type"]).to eq("single_use")
        expect(json["used_count"]).to eq(0)
      end
    end

    context "with an unknown token" do
      it "returns usable: false with reason invalid" do
        get "/api/v1/invites/#{Invite.generate_raw_token}"
        expect(response).to have_http_status(:ok)
        expect(json["usable"]).to be false
        expect(json["reason"]).to eq("invalid")
      end
    end

    context "with a blank or too-short token" do
      it "returns usable: false for a short token" do
        get "/api/v1/invites/short"
        expect(response).to have_http_status(:ok)
        expect(json["usable"]).to be false
        expect(json["reason"]).to eq("invalid")
      end
    end

    context "with an expired invite" do
      let(:raw_token) { Invite.generate_raw_token }
      let!(:invite) do
        create(:invite, :expired, token_digest: Invite.digest_token(raw_token))
      end

      it "returns usable: false with reason expired" do
        get "/api/v1/invites/#{raw_token}"
        expect(response).to have_http_status(:ok)
        expect(json["usable"]).to be false
        expect(json["reason"]).to eq("expired")
      end
    end

    context "with a consumed single_use invite" do
      let(:raw_token) { Invite.generate_raw_token }
      let!(:invite) do
        create(:invite, :consumed, token_digest: Invite.digest_token(raw_token))
      end

      it "returns usable: false with reason consumed" do
        get "/api/v1/invites/#{raw_token}"
        expect(response).to have_http_status(:ok)
        expect(json["usable"]).to be false
        expect(json["reason"]).to eq("consumed")
      end
    end

    context "with an exhausted multi_use invite" do
      let(:raw_token) { Invite.generate_raw_token }
      let!(:invite) do
        create(:invite, usage_type: :multi_use, max_uses: 2, used_count: 2, status: :consumed,
               token_digest: Invite.digest_token(raw_token))
      end

      it "returns usable: false with reason consumed" do
        get "/api/v1/invites/#{raw_token}"
        expect(response).to have_http_status(:ok)
        expect(json["usable"]).to be false
      end
    end
  end

  describe "POST /api/v1/invites/:token/consume" do
    context "single_use invite" do
      let(:raw_token) { Invite.generate_raw_token }
      let!(:invite) { create(:invite, token_digest: Invite.digest_token(raw_token)) }

      it "succeeds on first consume" do
        post "/api/v1/invites/#{raw_token}/consume"
        expect(response).to have_http_status(:ok)
        expect(json["consumed"]).to be true
        expect(json["used_count"]).to eq(1)
      end

      it "fails on second consume" do
        post "/api/v1/invites/#{raw_token}/consume"
        post "/api/v1/invites/#{raw_token}/consume"
        expect(response).to have_http_status(:unprocessable_entity)
        expect(json["consumed"]).to be_nil
        expect(json["error"]).to be_present
        expect(json["code"]).to eq("consumed")
      end
    end

    context "multi_use invite" do
      let(:raw_token) { Invite.generate_raw_token }
      let!(:invite) do
        create(:invite, usage_type: :multi_use, max_uses: 3,
               token_digest: Invite.digest_token(raw_token))
      end

      it "increments used_count on each consume" do
        post "/api/v1/invites/#{raw_token}/consume"
        expect(response).to have_http_status(:ok)
        expect(json["used_count"]).to eq(1)
      end

      it "allows consumption up to max_uses times" do
        2.times do
          post "/api/v1/invites/#{raw_token}/consume"
          expect(response).to have_http_status(:ok)
        end
      end

      it "rejects consumption beyond max_uses" do
        3.times { post "/api/v1/invites/#{raw_token}/consume" }
        post "/api/v1/invites/#{raw_token}/consume"
        expect(response).to have_http_status(:unprocessable_entity)
        expect(json["code"]).to eq("exhausted")
      end
    end

    context "with an unknown token" do
      it "returns 404" do
        post "/api/v1/invites/#{Invite.generate_raw_token}/consume"
        expect(response).to have_http_status(:not_found)
        expect(json["code"]).to eq("not_found")
      end
    end

    context "with an expired invite" do
      let(:raw_token) { Invite.generate_raw_token }
      let!(:invite) do
        create(:invite, :expired, token_digest: Invite.digest_token(raw_token))
      end

      it "returns 422 with code expired" do
        post "/api/v1/invites/#{raw_token}/consume"
        expect(response).to have_http_status(:unprocessable_entity)
        expect(json["code"]).to eq("expired")
      end
    end

    context "with a too-short token" do
      it "returns 404" do
        post "/api/v1/invites/short/consume"
        expect(response).to have_http_status(:not_found)
        expect(json["code"]).to eq("not_found")
      end
    end
  end
end
