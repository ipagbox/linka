class Invite < ApplicationRecord
  TOKEN_MIN_LENGTH = 16

  enum :usage_type, { single_use: "single_use", multi_use: "multi_use" }
  enum :status,     { active: "active", consumed: "consumed" }

  validates :token_digest, presence: true, uniqueness: true
  validates :usage_type, presence: true
  validates :max_uses,
            presence: true,
            numericality: { only_integer: true, greater_than: 0 },
            if: :multi_use?
  validates :used_count, numericality: { only_integer: true, greater_than_or_equal_to: 0 }

  # Generate a secure random raw token (returned once at creation)
  def self.generate_raw_token
    SecureRandom.urlsafe_base64(32)
  end

  # Digest a raw token for safe storage and lookup
  def self.digest_token(raw_token)
    Digest::SHA256.hexdigest(raw_token)
  end

  # Safely look up an invite by its raw token.
  # Returns nil for blank, too-short, or non-existent tokens.
  def self.find_by_raw_token(raw_token)
    return nil if raw_token.blank?
    return nil if raw_token.length < TOKEN_MIN_LENGTH

    find_by(token_digest: digest_token(raw_token))
  end

  # True if the invite can currently be used
  def usable?
    return false unless active?
    return false if expired?
    return false if exhausted?

    true
  end

  def expired?
    expires_at.present? && expires_at <= Time.current
  end

  def exhausted?
    return false unless multi_use?

    max_uses.present? && used_count >= max_uses
  end

  # Machine-readable reason why the invite is not usable, or nil if usable
  def unusability_reason
    return :expired   if expired?
    return :exhausted if exhausted?
    return :consumed  if consumed?

    nil
  end

  # Record one use of this invite.
  # Raises InviteNotUsableError if the invite is not currently usable.
  # Uses an advisory lock to protect against concurrent consumption.
  def consume!
    unless usable?
      raise InviteNotUsableError, unusability_reason || :invalid
    end

    with_lock do
      reload

      unless usable?
        raise InviteNotUsableError, unusability_reason || :invalid
      end

      self.used_count += 1
      self.last_used_at = Time.current

      if single_use? || (multi_use? && max_uses.present? && used_count >= max_uses)
        self.status = :consumed
      end

      save!
    end

    true
  end
end

class InviteNotUsableError < StandardError
  def initialize(reason = :invalid)
    @reason = reason
    super("Invite is not usable: #{reason}")
  end

  def reason
    @reason
  end
end
