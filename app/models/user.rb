class User < ApplicationRecord
  IANA_TIMEZONES = TZInfo::Timezone.all_identifiers.freeze

  before_validation :assign_uuid_id, on: :create

  validates :id, presence: true, uniqueness: true
  validates :timezone, presence: true, inclusion: { in: IANA_TIMEZONES }

  private

  def assign_uuid_id
    self.id ||= SecureRandom.uuid
  end
end
