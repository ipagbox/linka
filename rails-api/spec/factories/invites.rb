FactoryBot.define do
  factory :invite do
    sequence(:token_digest) { |n| Digest::SHA256.hexdigest("token_#{n}_#{SecureRandom.hex(8)}") }
    usage_type { :single_use }
    status     { :active }
    used_count { 0 }
    max_uses   { nil }
    expires_at { nil }
    note       { nil }
    created_by_identifier { nil }

    trait :multi_use do
      usage_type { :multi_use }
      max_uses   { 5 }
    end

    trait :consumed do
      status { :consumed }
    end

    trait :expired do
      expires_at { 1.day.ago }
    end

    trait :expiring_soon do
      expires_at { 1.hour.from_now }
    end
  end
end
