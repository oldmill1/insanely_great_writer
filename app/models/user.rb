class User < ApplicationRecord
  has_many :documents, dependent: :destroy

  # Devise handles authentication while app-specific fields remain local.
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable,
         :confirmable, :lockable
  IANA_TIMEZONES = TZInfo::Timezone.all_identifiers.freeze

  before_validation :assign_uuid_id, :assign_default_timezone, on: :create

  validates :id, presence: true, uniqueness: true
  validates :timezone, presence: true, inclusion: { in: IANA_TIMEZONES }
  validates :author_name, presence: true, length: { maximum: 120 }, on: :create

  private

  def assign_uuid_id
    self.id ||= SecureRandom.uuid
  end

  def assign_default_timezone
    self.timezone ||= "UTC"
  end
end
