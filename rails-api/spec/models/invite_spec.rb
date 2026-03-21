require "rails_helper"

RSpec.describe Invite, type: :model do
  describe "validations" do
    it "is valid with required fields for single_use" do
      invite = build(:invite, usage_type: :single_use)
      expect(invite).to be_valid
    end

    it "is valid with required fields for multi_use" do
      invite = build(:invite, usage_type: :multi_use, max_uses: 3)
      expect(invite).to be_valid
    end

    it "is invalid without a token_digest" do
      invite = build(:invite, token_digest: nil)
      expect(invite).not_to be_valid
      expect(invite.errors[:token_digest]).to be_present
    end

    it "is invalid without a usage_type" do
      invite = build(:invite, usage_type: nil)
      expect(invite).not_to be_valid
    end

    it "is invalid when multi_use has no max_uses" do
      invite = build(:invite, usage_type: :multi_use, max_uses: nil)
      expect(invite).not_to be_valid
      expect(invite.errors[:max_uses]).to be_present
    end

    it "is invalid when max_uses is zero" do
      invite = build(:invite, usage_type: :multi_use, max_uses: 0)
      expect(invite).not_to be_valid
    end

    it "enforces unique token_digest" do
      create(:invite, token_digest: "deadbeef" * 8)
      duplicate = build(:invite, token_digest: "deadbeef" * 8)
      expect(duplicate).not_to be_valid
      expect(duplicate.errors[:token_digest]).to be_present
    end
  end

  describe ".find_by_raw_token" do
    let(:raw_token) { Invite.generate_raw_token }
    let!(:invite) do
      create(:invite, token_digest: Invite.digest_token(raw_token))
    end

    it "finds an invite by its raw token" do
      expect(Invite.find_by_raw_token(raw_token)).to eq(invite)
    end

    it "returns nil for a blank token" do
      expect(Invite.find_by_raw_token("")).to be_nil
      expect(Invite.find_by_raw_token(nil)).to be_nil
    end

    it "returns nil for a token shorter than the minimum length" do
      expect(Invite.find_by_raw_token("short")).to be_nil
    end

    it "returns nil for a token that does not exist" do
      expect(Invite.find_by_raw_token(Invite.generate_raw_token)).to be_nil
    end

    it "returns nil for a token of correct length but wrong value" do
      wrong_token = "a" * Invite::TOKEN_MIN_LENGTH
      expect(Invite.find_by_raw_token(wrong_token)).to be_nil
    end
  end

  describe "#usable?" do
    it "returns true for an active, non-expired, non-exhausted single_use invite" do
      invite = build(:invite, usage_type: :single_use, status: :active)
      expect(invite.usable?).to be true
    end

    it "returns true for an active multi_use invite with remaining uses" do
      invite = build(:invite, :multi_use, used_count: 2, max_uses: 5)
      expect(invite.usable?).to be true
    end

    it "returns false for a consumed single_use invite" do
      invite = build(:invite, status: :consumed)
      expect(invite.usable?).to be false
    end

    it "returns false for an expired invite" do
      invite = build(:invite, :expired)
      expect(invite.usable?).to be false
    end

    it "returns false for an exhausted multi_use invite" do
      invite = build(:invite, :multi_use, used_count: 5, max_uses: 5)
      expect(invite.usable?).to be false
    end
  end

  describe "#expired?" do
    it "returns false when expires_at is nil" do
      invite = build(:invite, expires_at: nil)
      expect(invite.expired?).to be false
    end

    it "returns false when expires_at is in the future" do
      invite = build(:invite, expires_at: 1.hour.from_now)
      expect(invite.expired?).to be false
    end

    it "returns true when expires_at is in the past" do
      invite = build(:invite, :expired)
      expect(invite.expired?).to be true
    end

    it "returns true when expires_at is exactly now" do
      invite = build(:invite, expires_at: Time.current)
      expect(invite.expired?).to be true
    end
  end

  describe "#exhausted?" do
    it "returns false for a single_use invite" do
      invite = build(:invite, usage_type: :single_use)
      expect(invite.exhausted?).to be false
    end

    it "returns false for multi_use with remaining capacity" do
      invite = build(:invite, :multi_use, used_count: 3, max_uses: 5)
      expect(invite.exhausted?).to be false
    end

    it "returns true for multi_use at max capacity" do
      invite = build(:invite, :multi_use, used_count: 5, max_uses: 5)
      expect(invite.exhausted?).to be true
    end
  end

  describe "#unusability_reason" do
    it "returns nil when invite is usable" do
      invite = build(:invite)
      expect(invite.unusability_reason).to be_nil
    end

    it "returns :expired when invite is expired" do
      invite = build(:invite, :expired)
      expect(invite.unusability_reason).to eq(:expired)
    end

    it "returns :exhausted when multi_use is exhausted" do
      invite = build(:invite, :multi_use, used_count: 5, max_uses: 5)
      expect(invite.unusability_reason).to eq(:exhausted)
    end

    it "returns :consumed when single_use is consumed" do
      invite = build(:invite, status: :consumed)
      expect(invite.unusability_reason).to eq(:consumed)
    end
  end

  describe "#consume!" do
    context "single_use invite" do
      let!(:invite) { create(:invite, usage_type: :single_use) }

      it "marks the invite as consumed on first use" do
        invite.consume!
        expect(invite.reload.status).to eq("consumed")
        expect(invite.used_count).to eq(1)
        expect(invite.last_used_at).to be_present
      end

      it "raises InviteNotUsableError on second use" do
        invite.consume!
        expect { invite.reload.consume! }.to raise_error(InviteNotUsableError)
      end
    end

    context "multi_use invite" do
      let!(:invite) { create(:invite, usage_type: :multi_use, max_uses: 3) }

      it "increments used_count on each use" do
        invite.consume!
        expect(invite.reload.used_count).to eq(1)
        expect(invite.status).to eq("active")
      end

      it "remains usable until max_uses is reached" do
        2.times { invite.reload.consume! }
        expect(invite.reload.usable?).to be true
      end

      it "becomes consumed when max_uses is reached" do
        3.times { invite.reload.consume! }
        expect(invite.reload.status).to eq("consumed")
        expect(invite.used_count).to eq(3)
      end

      it "raises InviteNotUsableError when exhausted" do
        3.times { invite.reload.consume! }
        expect { invite.reload.consume! }.to raise_error(InviteNotUsableError)
      end
    end

    context "expired invite" do
      let!(:invite) { create(:invite, :expired) }

      it "raises InviteNotUsableError" do
        expect { invite.consume! }.to raise_error(InviteNotUsableError)
      end

      it "does not increment used_count" do
        invite.consume! rescue nil
        expect(invite.reload.used_count).to eq(0)
      end
    end
  end
end
